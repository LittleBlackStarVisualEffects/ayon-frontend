import { Section } from '@ynput/ayon-react-components'
import Type from '/src/theme/typography.module.css'
import AddonFilters from './AddonFilters'
import { useMemo, useState } from 'react'
import {
  useGetMarketAddonQuery,
  useGetMarketAddonsQuery,
  useLazyGetMarketAddonQuery,
} from '/src/services/market/getMarket'
import AddonsList from './AddonsList'
import 'react-perfect-scrollbar/dist/css/styles.css'
import AddonDetails from './AddonDetails'
import { useGetAddonListQuery } from '/src/services/addons/getAddons'
import mergeAddonsData from './mergeAddonsData'

const placeholders = [...Array(10)].map((_, i) => ({
  name: `Addon ${i}`,
  isPlaceholder: true,
  orgTitle: 'Loading...',
}))

const MarketPage = () => {
  // GET ALL ADDONS IN MARKET
  const { data: marketAddons, isLoading: isLoadingMarket } = useGetMarketAddonsQuery()
  // GET ALL INSTALLED ADDONS
  const { data: installedAddons, isLoading: isLoadingInstalled } = useGetAddonListQuery()

  const isLoading = isLoadingMarket || isLoadingInstalled

  const addons = useMemo(() => {
    return isLoading ? [] : mergeAddonsData(marketAddons, installedAddons)
  }, [isLoading, marketAddons, installedAddons])

  const [selectedAddonId, setSelectedAddonId] = useState(null)

  // GET SELECTED ADDON
  const { data: selectedAddon = {} } = useGetMarketAddonQuery(selectedAddonId, {
    skip: !selectedAddonId,
  })

  // GET SELECTED ADDON LAZY for performance (fetches on addon hover)
  const [getAddon] = useLazyGetMarketAddonQuery()

  const [cachedIds, setCachedIds] = useState([])
  // prefetch addon
  const handleHover = async (id) => {
    if (isLoading) return
    if (cachedIds.includes(id)) return
    setCachedIds([...cachedIds, id])
    await getAddon(id)
  }

  // FILTER ADDONS BY FIELDS
  // const [filter, setFilter] = useState([])

  return (
    <main style={{ flexDirection: 'column', overflow: 'hidden', paddingBottom: 0 }}>
      <h1 className={Type.headlineSmall}>Addon Market</h1>
      <Section style={{ overflow: 'hidden', flexDirection: 'row' }}>
        <AddonFilters />
        <AddonsList
          addons={isLoading ? placeholders : addons}
          selected={selectedAddonId}
          onSelect={setSelectedAddonId}
          onHover={handleHover}
        />
        <AddonDetails addon={selectedAddon} />
      </Section>
    </main>
  )
}

export default MarketPage
