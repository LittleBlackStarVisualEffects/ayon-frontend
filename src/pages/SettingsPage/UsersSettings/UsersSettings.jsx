import { useState, useMemo, useRef } from 'react'
import { toast } from 'react-toastify'
import { Button, Section, Toolbar, InputText, Spacer, Panel } from '@ynput/ayon-react-components'
// Comps
import SetPasswordDialog from './SetPasswordDialog'
import RenameUserDialog from './RenameUserDialog'
// utils
import './users.scss'
import useSearchFilter from '@hooks/useSearchFilter'
import { useGetUsersQuery } from '@queries/user/getUsers'
import ProjectList from '@containers/projectList'
import UserDetail from './userDetail'
import UserList from './UserList'
import { useDeleteUserMutation } from '@queries/user/updateUser'
import { Splitter, SplitterPanel } from 'primereact/splitter'
import { useSelector } from 'react-redux'
import UsersOverview from './UsersOverview'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import NewUser from './newUser'
import confirmDelete from '@helpers/confirmDelete'
import { useGetAccessGroupsQuery } from '@queries/accessGroups/getAccessGroups'
import Shortcuts from '@containers/Shortcuts'
import SwitchButton from '@components/SwitchButton/SwitchButton'

// what to show in the access column
const formatAccessGroups = (rowData, selectedProjects) => {
  let res = {}
  // If the user is an admin, add 'admin' role
  if (rowData.isAdmin) res.admin = { cls: 'role admin' }
  // If the user is a service, add 'service' role
  else if (rowData.isService) res.service = { cls: 'role manager' }
  // If the user is a manager, add 'manager' role
  else if (rowData.isManager) res.manager = { cls: 'role manager' }
  // If no projects are selected, add default access groups
  else if (!selectedProjects) {
    // add all access groups
    for (const project in rowData.accessGroups) {
      const projectAG = rowData.accessGroups[project]
      for (const agName of projectAG) {
        // add to res if not already there
        if (!(agName in res)) res[agName] = { cls: 'role' }
      }
    }
  } else {
    // If projects are selected, add access groups for each selected project
    const agSet = rowData.accessGroups || {}
    for (const projectName of selectedProjects) {
      for (const agName of agSet[projectName] || []) {
        // If the access group is already in the result, increment its count
        if (agName in res) res[agName].count += 1
        // Otherwise, add the access group to the result with a count of 1
        else res[agName] = { count: 1 }
        // Set the class of the access group based on whether its count is equal to the number of selected projects
        res[agName].cls =
          res[agName].count === selectedProjects.length ? 'role all' : 'role partial'
      }
    }
  }

  // if res is empty add none
  if (!Object.keys(res).length) res.none = { cls: 'role partial' }

  return { ...rowData, accessGroups: res, accessGroupList: Object.keys(res) }
}

const UsersSettings = () => {
  // QUERY PARAMS STATE
  const [searchParams] = useSearchParams()
  const queryNames = searchParams.getAll('name')

  const [selectedUsers, setSelectedUsers] = useState([])

  const toastId = useRef(null)

  // set initial selected users
  useEffect(() => {
    if (queryNames.length) {
      setSelectedUsers(queryNames)
      // remove from url
      searchParams.delete('name')
      window.history.replaceState({}, '', `${window.location.pathname}?${searchParams}`)
    }
  }, [])

  // USE STATE
  const [selectedProjects, setSelectedProjects] = useState(null)
  const [showNewUser, setShowNewUser] = useState(false)
  const [showNewServiceUser, setShowNewServiceUser] = useState(false)
  const [showRenameUser, setShowRenameUser] = useState(false)
  const [showSetPassword, setShowSetPassword] = useState(false)
  // show users for selected projects
  const [projectAccessOnly, setProjectAccessOnly] = useState(true)

  // get user name from redux
  const selfName = useSelector((state) => state.user.name)
  const isAdmin = useSelector((state) => state.user.data.isAdmin)
  const isSelfSelected = selectedUsers.includes(selfName)

  // RTK QUERY HOOKS
  let { data: userList = [], isLoading, isError, isFetching } = useGetUsersQuery({ selfName })
  if (isError || !Array.isArray(userList)) {
    userList = []
    toast.error('Unable to load users')
  }

  // GET ACCESS GROUPS QUERY
  const { data: accessGroupsData } = useGetAccessGroupsQuery()

  // MUTATION HOOK
  const [deleteUser] = useDeleteUserMutation()

  let filteredUserList = useMemo(() => {
    // filter out users that are not in project if projectAccessOnly is true
    if (selectedProjects) {
      return userList.filter((user) => {
        // user level not user
        if (user.isManager || user.isAdmin || user.isService) return true

        // check user has access group in selected projects
        const agSet = user.accessGroups
        let hasAccessGroup = selectedProjects.some((project) => agSet[project]?.length)

        return hasAccessGroup
      })
    } else {
      return userList
    }
  }, [userList, selectedProjects])

  const onDelete = async () => {
    confirmDelete({
      label: `${selectedUsers.length} Users`,
      showToasts: false,
      accept: async () => {
        toastId.current = toast.info('Deleting users...')
        let i = 0
        for (const user of selectedUsers) {
          try {
            await deleteUser({ user }).unwrap()
            toast.update(toastId.current, {
              render: `Deleted user: ${user}`,
              type: toast.TYPE.SUCCESS,
            })
            setSelectedUsers([])
            i += 1
          } catch {
            toast.error(`Unable to delete user: ${user}`)
          }
        }
        toast.update(toastId.current, { render: `Deleted ${i} user(s)`, type: toast.TYPE.SUCCESS })
      },
    })
  }

  const onTotal = (total) => {
    // if total already in search, remove it
    if (search === total) return setSearch('')

    // if "total" select all users
    // else set search to total
    if (total === 'total') {
      setSearch('')
      setSelectedUsers(filteredUserList.map((user) => user.name))
      if (selectedProjects) setProjectAccessOnly(true)
    } else {
      setSearch(total)
    }
  }

  const openNewUser = () => {
    setShowNewUser(true)
  }
  const openNewServiceUser = () => {
    setShowNewServiceUser(true)
  }

  // use filteredUserList if projectAccessOnly
  // else use userList

  if (projectAccessOnly) userList = filteredUserList

  let userListWithAccessGroups = useMemo(
    () => userList.map((user) => formatAccessGroups(user, selectedProjects)),
    [userList, selectedProjects],
  )

  const searchableFields = [
    'name',
    'attrib.fullName',
    'attrib.email',
    'accessGroupList',
    'hasPassword',
  ]

  const [search, setSearch, filteredData] = useSearchFilter(
    searchableFields,
    userListWithAccessGroups,
    'users',
  )

  const selectedUserList = userList.filter((user) => selectedUsers.includes(user.name))

  const levels = useMemo(() => {
    let levels = []
    selectedUserList.forEach((user) => {
      let res
      if (user.isAdmin) res = 'admin'
      else if (user.isService) res = 'service'
      else if (user.isManager) res = 'manager'
      else res = 'user'

      if (!levels.includes(res)) levels.push(res)
    })

    return levels
  }, [selectedUserList])

  // managers can't update admin users
  const managerDisabled = levels.some((l) => ['admin'].includes(l)) && !isAdmin && !isSelfSelected

  const shortcuts = useMemo(
    () => [
      {
        key: 'n',
        action: () => setShowNewUser(true),
      },
    ],
    [showNewUser],
  )

  return (
    <>
      <Shortcuts shortcuts={shortcuts} deps={[showNewUser]} />

      <NewUser
        onHide={(newUsers = []) => {
          setShowNewUser(false)
          if (newUsers.length) setSelectedUsers(newUsers)
        }}
        open={showNewUser}
        accessGroupsData={accessGroupsData}
      />

      <NewUser
        onHide={(newUsers = []) => {
          setShowNewServiceUser(false)
          if (newUsers.length) setSelectedUsers(newUsers)
        }}
        open={showNewServiceUser}
        serviceUser={true}
      />

      <main>
        <Section>
          <Toolbar>
            <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <InputText
                style={{ width: '200px' }}
                placeholder="Filter users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autocomplete="search-users"
              />
            </form>
            <Spacer />
            <Button
              onClick={onDelete}
              label="Delete Users"
              icon="person_remove"
              disabled={!selectedUsers.length || isSelfSelected || managerDisabled}
            />
            <Button
              onClick={openNewUser}
              label="Add New User"
              icon="person_add"
              data-shortcut="n"
            />
            <Button
              onClick={openNewServiceUser}
              label="Add Service User"
              icon="person_add"
            />
          </Toolbar>
          <Splitter
            style={{ width: '100%', height: '100%' }}
            layout="horizontal"
            stateKey="users-panels"
            stateStorage="local"
          >
            <SplitterPanel size={10} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  icon="checklist"
                  style={{ flex: 1 }}
                  selected={!selectedProjects}
                  onClick={() => setSelectedProjects(null)}
                >
                  Show all users
                </Button>
              </div>
              <Panel style={{ flex: 1, gap: 0 }}>
                <SwitchButton
                  value={!selectedProjects ? false : projectAccessOnly}
                  onClick={() => setProjectAccessOnly(!projectAccessOnly)}
                  label="Filter users by project access"
                  disabled={!selectedProjects}
                  data-tooltip="Filter users with access to the selected projects. Turn off to see all users."
                />
                <Section>
                  <ProjectList
                    multiselect={true}
                    selection={selectedProjects}
                    onSelect={setSelectedProjects}
                    style={{ maxWidth: 'unset' }}
                    wrap
                  />
                </Section>
              </Panel>
            </SplitterPanel>
            <SplitterPanel size={50}>
              <UserList
                userList={userList}
                tableList={filteredData}
                onSelectUsers={setSelectedUsers}
                isFetching={isFetching}
                {...{
                  selectedProjects,
                  selectedUsers,
                  setShowSetPassword,
                  setShowRenameUser,
                  onDelete,
                  isLoading,
                  isSelfSelected,
                }}
              />
            </SplitterPanel>
            <SplitterPanel size={40} style={{ minWidth: 370 }}>
              {selectedUsers.length ? (
                <UserDetail
                  setShowRenameUser={setShowRenameUser}
                  selectedUsers={selectedUsers}
                  setShowSetPassword={setShowSetPassword}
                  selectedProjects={selectedProjects}
                  setSelectedUsers={setSelectedUsers}
                  isSelfSelected={isSelfSelected}
                  selectedUserList={selectedUserList}
                  managerDisabled={managerDisabled}
                  accessGroupsData={accessGroupsData}
                />
              ) : (
                <UsersOverview
                  selectedProjects={selectedProjects}
                  userList={filteredUserList}
                  onUserSelect={(user) => setSelectedUsers([user.name])}
                  onTotal={onTotal}
                  search={search}
                />
              )}
            </SplitterPanel>
          </Splitter>
        </Section>

        {showRenameUser && (
          <RenameUserDialog
            selectedUsers={selectedUsers}
            onHide={() => setShowRenameUser(false)}
            onSuccess={(name) => setSelectedUsers([name])}
          />
        )}

        {showSetPassword && (
          <SetPasswordDialog
            selectedUsers={selectedUsers}
            onHide={() => {
              setShowSetPassword(false)
            }}
          />
        )}
      </main>
    </>
  )
}

export default UsersSettings
