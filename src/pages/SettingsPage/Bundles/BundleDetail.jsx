import { useMemo, useState, useEffect } from 'react'
import styled from 'styled-components'
// import { toast } from 'react-toastify'
import {
  ScrollPanel,
  Section,
  InputText,
  Toolbar,
  Spacer,
  Dropdown,
  FormLayout,
  FormRow,
  Button,
} from '@ynput/ayon-react-components'

import { useGetInstallerListQuery } from '/src/services/installers'
// import { useGetAddonListQuery } from '/src/services/addonList'

import AddonVersions from './AddonVersions'

const Columns = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
`

const BundleDetail = ({ bundle, onDuplicate }) => {
  const { data: installerList = [] } = useGetInstallerListQuery()
  // const { data: addons, loading } = useGetAddonListQuery({ showVersions: true })

  const [formData, setFormData] = useState({})
  const [isNew, setIsNew] = useState(true)

  useEffect(() => {
    if (bundle) {
      setFormData(bundle)
      setIsNew(false)
    } else {
      setFormData({ installerVersion: installerList?.[0]?.version })
      setIsNew(true)
    }
  }, [bundle, installerList])

  const installerVersions = useMemo(() => {
    if (!installerList) return []

    const r = {}
    for (const installer of installerList) {
      if (r[installer.version]) {
        r[installer.version].push(installer.platform)
      } else {
        r[installer.version] = [installer.platform]
      }
    }

    return Object.entries(r).map(([version, platforms]) => ({
      label: `${version} (${platforms.join(', ')})`,
      value: version,
    }))
  }, [installerList])

  return (
    <Section>
      <Toolbar>
        <Spacer />
        <Button
          label="Duplicate and Edit"
          icon="edit_document"
          onClick={() => onDuplicate(formData.name)}
        />
      </Toolbar>
      <ScrollPanel style={{ flexGrow: 1 }} scrollStyle={{ padding: 10 }}>
        <FormLayout>
          <FormRow label="Name">
            <InputText
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={formData?.name ? {} : { outline: '1px solid var(--color-hl-error)' }}
              disabled={!isNew}
            />
          </FormRow>
          <FormRow label="Installer version">
            <Dropdown
              value={formData?.installerVersion ? [formData.installerVersion] : []}
              options={installerVersions}
              onChange={(e) => setFormData({ ...formData, installerVersion: e[0] })}
              disabled={!isNew}
              widthExpand
            />
          </FormRow>
        </FormLayout>

        <Columns>
          <section>
            <h2>Addons</h2>
            <AddonVersions formData={formData} setFormData={setFormData} readOnly={!isNew} />
          </section>
          <section style={{ flexGrow: 1 }}>
            <h2>Dependency packages</h2>
            {bundle && (
              <FormLayout>
                <FormRow label="Windows">{bundle.dependencyPackages?.windows || '(NONE)'}</FormRow>
                <FormRow label="Linux">{bundle.dependencyPackages?.linux || '(NONE)'}</FormRow>
                <FormRow label="MacOS">{bundle.dependencyPackages?.darwin || '(NONE)'}</FormRow>
              </FormLayout>
            )}
          </section>
        </Columns>
      </ScrollPanel>
    </Section>
  )
}

export default BundleDetail
