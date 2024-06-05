import { useState, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { InputText, TablePanel, Section, Toolbar, Spacer } from '@ynput/ayon-react-components'
import EntityDetail from '/src/containers/DetailsDialog'
import { CellWithIcon } from '/src/components/icons'
import { TimestampField } from '/src/containers/fieldFormat'
import usePubSub from '/src/hooks/usePubSub'
import groupResult from '/src/helpers/groupResult'
import useLocalStorage from '/src/hooks/useLocalStorage'
import {
  setFocusedVersions,
  setFocusedProducts,
  setSelectedVersions,
  setUri,
  productSelected,
  onFocusChanged,
  updateBrowserFilters,
} from '/src/features/context'
import VersionList from './VersionList'
import StatusSelect from '/src/components/status/statusSelect'
import {
  useGetProductListQuery,
  useLazyGetProductsVersionsQuery,
} from '/src/services/product/getProduct'
import usePatchProductsListWithVersions from '/src/hooks/usePatchProductsListWithVersions'
import useSearchFilter, { filterByFieldsAndValues } from '/src/hooks/useSearchFilter'
import useColumnResize from '/src/hooks/useColumnResize'
import { useUpdateEntitiesMutation } from '/src/services/entity/updateEntity'
import { ayonApi } from '/src/services/ayon'
import useCreateContext from '/src/hooks/useCreateContext'
import ViewModeToggle from './ViewModeToggle'
import ProductsList from './ProductsList'
import ProductsGrid from './ProductsGrid'
import NoProducts from './NoProducts'
import { toast } from 'react-toastify'
import { productTypes } from '/src/features/project'
import * as Styled from './Products.styled'

const Products = () => {
  const dispatch = useDispatch()

  // context
  // project redux
  const {
    name: projectName,
    statuses: statusesObject,
    tasksOrder = [],
    tasks = {},
  } = useSelector((state) => state.project)
  // focused redux
  const {
    versions: focusedVersions,
    folders: focusedFolders,
    products: focusedProducts,
    lastFocused,
  } = useSelector((state) => state.context.focused)
  // context redux
  const selectedVersions = useSelector((state) => state.context.selectedVersions)
  const pairing = useSelector((state) => state.context.pairing)

  const selectedTaskTypes = useSelector((state) => state.context.filters.browser.productTaskTypes)
  // create an array of options for the tasks dropdown using tasksOrder and tasks
  const taskOptions = useMemo(() => {
    return tasksOrder.map((taskId) => {
      const task = tasks[taskId]
      return {
        label: task.name,
        value: taskId,
        icon: task.icon,
      }
    })
  }, [tasks, tasksOrder])

  const handleTaskTypeChange = (value) => {
    dispatch(updateBrowserFilters({ productTaskTypes: value }))
  }

  const [showDetail, setShowDetail] = useState(false) // false or 'product' or 'version'
  // grid/list/grouped
  const [viewMode, setViewMode] = useLocalStorage('productsViewMode', 'list')
  const [grouped, setGrouped] = useState(false)

  // sets size of status based on status column width
  const [columnsWidths, setColumnWidths] = useColumnResize('products')

  const {
    data: productsData = [],
    isLoading,
    refetch,
    isFetching,
    error,
  } = useGetProductListQuery(
    {
      folderIds: focusedFolders,
      projectName,
    },
    { skip: !projectName },
  )

  // keep track of which products are loading (mainly used for versions loading)
  const [loadingProducts, setLoadingProducts] = useState([])

  // lazy query to fetch versions, the cache is based on versionIds provided
  const [getProductsVersions] = useLazyGetProductsVersionsQuery()

  // merge products and versions data
  const listData = productsData

  const patchProductsListWithVersions = usePatchProductsListWithVersions({ projectName })

  // get new versions data and patch into cache and update versions local state
  const handleVersionChange = async (productVersionPairs = [[]]) => {
    // productVersionPairs is an array of arrays

    const productIds = [],
      versionIds = []
    for (const [vId, pId] of productVersionPairs) {
      productIds.push(pId)
      versionIds.push(vId)
    }

    setLoadingProducts(productIds)

    try {
      const versions = await getProductsVersions({ ids: versionIds, projectName }, true).unwrap()

      patchProductsListWithVersions(versions)

      setLoadingProducts([])
      // return so that the focus can update
      return versions
    } catch (error) {
      console.error('Error while loading versions:', error)
      toast.error('Error while loading versions')
      setLoadingProducts([])
      return []
    }
  }

  // PUBSUB HOOK
  usePubSub(
    'entity.product',
    refetch,
    listData.map(({ id }) => id),
  )

  const [updateEntities] = useUpdateEntitiesMutation()

  const handleUpdate = async (field, value, ids = []) => {
    if (value === null || value === undefined) return console.error('value is null or undefined')

    try {
      // build entities operations array
      const operations = ids.map((id) => ({
        id: id,
        projectName: projectName,
        data: {
          [field]: value,
        },
      }))

      return await updateEntities({ operations, entityType: 'version' })
    } catch (error) {
      toast.error('Error updating' + 'version ')
    }
  }

  // update product status
  const handleStatusChange = async (value, selectedId) => {
    // get selected product ids based on focused selection
    let productIds = focusedProducts.includes(selectedId) ? focusedProducts : [selectedId]
    const products = listData.filter(({ id }) => productIds.includes(id))
    // get version ids from selected products
    const ids = products.map(({ versionId }) => versionId)

    const versions = products.map((product) => ({
      productId: product.id,
      versionId: product.versionId,
      versionStatus: value,
    }))

    // update productsList cache with new status
    patchProductsListWithVersions(versions)

    try {
      await handleUpdate('status', value, ids)

      // invalidate 'version' query (specific version query)
      // we do this so that when we select this version again, it doesn't use stale version query
      dispatch(ayonApi.util.invalidateTags(ids.map((id) => ({ type: 'version', id }))))

      // invalidate 'detail' query (details panel)
      // dispatch(ayonApi.util.invalidateTags(ids.map((id) => ({ type: 'detail', id }))))
    } catch (error) {
      console.error(error)

      toast.error(error?.message || 'Failed to update')
      // we also need to undo the patch
    }
  }

  const handleStatusOpen = (id) => {
    // handles the edge case where the use foccusess multiple products but then changes a different status
    if (!focusedProducts.includes(id)) {
      // not in focused selection
      // reset selection to status id
      dispatch(setFocusedProducts([id]))
    }
  }

  const onSelectVersion = async (
    { versionId, productId, folderId, versionName, currentSelected },
    data,
  ) => {
    // load data here and patch into cache
    const res = await handleVersionChange([[versionId, productId]])
    if (res) {
      // copy current selection
      let newSelection = { ...currentSelected }
      // update selection
      newSelection[productId] = { versionId, folderId }

      dispatch(setSelectedVersions(newSelection))
      // set selected product
      dispatch(productSelected({ products: [productId], versions: [versionId] }))
      // update breadcrumbs
      let uri = `ayon+entity://${projectName}/`
      uri += `${data.parents.join('/')}/${data.folder}`
      uri += `?product=${data.name}`
      uri += `&version=${versionName}`
      dispatch(setUri(uri))
    }
  }

  let columns = useMemo(
    () => [
      {
        field: 'name',
        header: 'Product',
        width: 200,
        body: (node) => {
          let className = ''
          let i = 0
          for (const pair of pairing) {
            i++
            if (pair.taskId === node.data.taskId) {
              className = `row-hl-${i}`
              break
            }
          }

          const icon = node.data.isGroup
            ? 'folder'
            : productTypes[node.data.productType]?.icon || 'inventory_2'

          return (
            <CellWithIcon
              icon={icon}
              iconClassName={className}
              text={node.data.label}
              name={node.data.name}
            />
          )
        },
      },
      {
        field: 'versionStatus',
        header: 'Version Status',
        width: 180,
        style: { height: 'max-content' },
        body: (node) => {
          if (node.data.isGroup) return ''
          const statusMaxWidth = 120
          const versionStatusWidth = columnsWidths['versionStatus']
          const resolveWidth = (statusWidth) => {
            if (statusWidth < 60) return 'icon'
            if (statusWidth < statusMaxWidth) return 'short'
            return 'full'
          }

          return (
            <StatusSelect
              value={node.data.versionStatus}
              size={resolveWidth(versionStatusWidth)}
              onChange={(v) => handleStatusChange(v, node.data.id)}
              multipleSelected={focusedProducts.length}
              onOpen={() => handleStatusOpen(node.data.id)}
              style={{ maxWidth: '100%' }}
            />
          )
        },
      },
      {
        field: 'productType',
        header: 'Product type',
        width: 120,
      },
      {
        field: 'taskName',
        header: 'Task',
        width: 120,
      },
      {
        field: 'folder',
        header: 'Folder',
        width: 120,
      },
      {
        field: 'versionList',
        header: 'Version',
        width: 70,
        body: (node) => (
          <VersionList
            row={node.data}
            selectedVersions={selectedVersions}
            onSelectVersion={(version) => onSelectVersion(version, node.data)}
          />
        ),
      },
      {
        field: 'createdAt',
        header: 'Created At',
        width: 150,
        body: (node) => node.data.createdAt && <TimestampField value={node.data.createdAt} />,
      },
      {
        field: 'versionAuthor',
        header: 'Author',
        width: 120,
      },
      {
        field: 'frames',
        header: 'Frames',
        width: 120,
      },
    ],
    [
      columnsWidths,
      focusedProducts,
      pairing,
      productTypes,
      selectedVersions,
      handleStatusChange,
      handleStatusOpen,
      listData,
    ],
  )

  const filterOptions = columns.map(({ field, header }) => ({
    value: field,
    label: header || field,
  }))
  const allColumnsNames = filterOptions.map(({ value }) => value)
  const isMultiSelected = focusedFolders.length > 1

  const [shownColumnsSingleFocused, setShownColumnsSingleFocused] = useLocalStorage(
    'products-columns-filter-single',
    allColumnsNames,
  )
  const [shownColumnsMultiFocused, setShownColumnsMultiFocused] = useLocalStorage(
    'products-columns-filter-multi',
    allColumnsNames,
  )

  const handleColumnsFilter = (value = []) => {
    // if multiple folders are selected, we need to save the columns in a different local storage
    isMultiSelected ? setShownColumnsMultiFocused(value) : setShownColumnsSingleFocused(value)
  }

  // sort columns if localstorage set
  let columnsOrder = localStorage.getItem('products-columns-order')
  if (columnsOrder) {
    try {
      columnsOrder = JSON.parse(columnsOrder)
      columns.sort((a, b) => columnsOrder[a.field] - columnsOrder[b.field])
    } catch (error) {
      console.log(error)
      // remove local stage
      localStorage.removeItem('products-columns-order')
    }
  }

  const shownColumns = isMultiSelected ? shownColumnsMultiFocused : shownColumnsSingleFocused

  // only filter if above zero otherwise show all columns
  if (shownColumns.length) {
    columns = columns.filter(({ field }) => shownColumns.includes(field))
  }

  //
  // Hooks
  //

  // Parse focusedVersions list from the project context
  // and create a list of selected product rows compatible
  // with the TreeTable component

  const selectedRows = useMemo(() => {
    if (focusedVersions?.length === 0) return {}
    const productIds = {}
    for (const sdata of listData) {
      if (focusedVersions.includes(sdata.versionId)) {
        productIds[sdata.id] = true
      }
    }
    return productIds
  }, [listData, focusedVersions])

  // Transform the product data into a TreeTable compatible format
  // by grouping the data by the product name

  let tableData = useMemo(() => {
    return groupResult(listData, 'name')
  }, [listData])

  // filter by task types
  const filteredByFieldsData = selectedTaskTypes.length
    ? filterByFieldsAndValues({
        filters: selectedTaskTypes,
        data: tableData,
        fields: ['data.taskType'],
      })
    : tableData

  const searchableFields = [
    'data.versionAuthor',
    'data.productType',
    'data.folder',
    'data.fps',
    'data.frames',
    'data.name',
    'data.resolution',
    'data.versionStatus',
    'data.versionName',
    'data.taskType',
    'data.taskName',
  ]

  let [search, setSearch, filteredBySearchData] = useSearchFilter(
    searchableFields,
    filteredByFieldsData,
    'products',
  )

  //
  // Handlers
  //

  // create empty context menu model
  // we will populate it later
  const [showTableContextMenu] = useCreateContext([])

  // context menu model for hiding columns
  const createTableHeaderModel = useCallback(
    (name) => {
      const oldArray = isMultiSelected ? shownColumnsMultiFocused : shownColumnsSingleFocused
      const newArray = oldArray.filter((item) => item !== name)
      const disabled = newArray.length === 0
      const command = () =>
        isMultiSelected
          ? setShownColumnsMultiFocused(newArray)
          : setShownColumnsSingleFocused(newArray)

      return [
        {
          label: 'Hide column',
          icon: 'visibility_off',
          disabled,
          command,
        },
      ]
    },
    [
      isMultiSelected,
      shownColumnsMultiFocused,
      shownColumnsSingleFocused,
      setShownColumnsMultiFocused,
      setShownColumnsSingleFocused,
    ],
  )

  const handleTablePanelContext = (e) => {
    // find the th that was clicked
    const th = e.target.closest('th')

    // return is no th was found
    if (!th) return

    // get the first class of the th (field name)
    const field = th.classList[0]
    if (field) {
      // show context menu
      showTableContextMenu(e, createTableHeaderModel(field))
    }
  }

  // Set the breadcrumbs when a row is clicked
  const onRowClick = (event) => {
    if (event.node.data.isGroup) {
      return
    }

    let uri = `ayon+entity://${projectName}/`
    uri += `${event.node.data.parents.join('/')}/${event.node.data.folder}`
    uri += `?product=${event.node.data.name}`
    uri += `&version=${event.node.data.versionName}`
    dispatch(setUri(uri))
    dispatch(onFocusChanged(event.node.data.id))
  }

  const onSelectionChange = (event) => {
    let versions = []
    let products = []
    const selection = Object.keys(event.value)
    for (const sdata of listData) {
      if (selection.includes(sdata.id)) {
        versions.push(sdata.versionId)
        products.push(sdata.id)
      }
    }
    // we need to set the focused versions first
    // otherwise setFocusedProducts will clear the selection
    // of versions.
    dispatch(productSelected({ products, versions }))
  }

  const onContextMenuSelectionChange = (event) => {
    if (focusedProducts.includes(event.value)) return
    const productId = event.value
    const versionId = listData.find((s) => s.id === productId).versionId
    dispatch(setFocusedProducts([productId]))
    dispatch(setFocusedVersions([versionId]))
  }

  const ctxMenuItems = [
    {
      label: 'Product detail',
      command: () => setShowDetail('product'),
      icon: 'database',
    },
    {
      label: 'Version detail',
      command: () => setShowDetail('version'),
      icon: 'database',
    },
  ]

  const [ctxMenuShow] = useCreateContext(ctxMenuItems)

  //
  // Render
  //

  const isNone = filteredBySearchData.length === 0

  return (
    <Section wrap>
      <Toolbar>
        <InputText
          style={{ width: '200px' }}
          placeholder="Filter products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autocomplete="off"
          data-tooltip="Use '!' to exclude and ',' to separate multiple filters. Example: '!image, render, compositing'"
        />
        <Styled.TaskFilterDropdown
          value={selectedTaskTypes}
          options={taskOptions}
          onChange={handleTaskTypeChange}
          onClear={!!selectedTaskTypes.length && handleTaskTypeChange}
          clearTooltip="Clear task types"
          placeholder="Task types..."
          multiSelect
        />
        <Styled.ColumnsFilterSelect
          options={filterOptions}
          value={shownColumns}
          onChange={handleColumnsFilter}
          onClear={!!shownColumns.length && handleColumnsFilter}
          multiSelect
        />
        <Spacer />
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          grouped={grouped || focusedFolders.length > 1}
          setGrouped={setGrouped}
          disabled={focusedFolders.length > 1 ? ['grid'] : []}
        />
      </Toolbar>
      <TablePanel style={{ overflow: 'hidden' }} onContextMenu={handleTablePanelContext}>
        <EntityDetail
          projectName={projectName}
          entityType={showDetail || 'product'}
          entityIds={showDetail === 'product' ? focusedProducts : focusedVersions}
          visible={!!showDetail}
          onHide={() => setShowDetail(false)}
        />
        {viewMode !== 'list' && (
          <ProductsGrid
            isLoading={isLoading || isFetching}
            data={filteredBySearchData}
            onItemClick={onRowClick}
            onSelectionChange={onSelectionChange}
            onContext={ctxMenuShow}
            onContextMenuSelectionChange={onContextMenuSelectionChange}
            selection={selectedRows}
            productTypes={productTypes}
            statuses={statusesObject}
            lastSelected={lastFocused}
            groupBy={grouped || focusedFolders.length > 1 ? 'productType' : null}
            multipleFoldersSelected={focusedFolders.length > 1}
            projectName={projectName}
          />
        )}
        {viewMode === 'list' && (
          <ProductsList
            data={filteredBySearchData}
            selectedRows={selectedRows}
            onSelectionChange={onSelectionChange}
            onRowClick={onRowClick}
            ctxMenuShow={ctxMenuShow}
            onContextMenuSelectionChange={onContextMenuSelectionChange}
            setColumnWidths={setColumnWidths}
            columns={columns}
            columnsWidths={columnsWidths}
            isLoading={isLoading || isFetching}
            loadingProducts={loadingProducts}
          />
        )}
        {isNone && !isLoading && !isFetching && <NoProducts error={error} />}
      </TablePanel>
    </Section>
  )
}

export default Products
