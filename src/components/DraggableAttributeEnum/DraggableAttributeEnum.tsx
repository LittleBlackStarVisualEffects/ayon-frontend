import { useState } from 'react'
import { createPortal } from 'react-dom'
import { uniqueId } from 'lodash'
import { closestCenter, DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { Button } from '@ynput/ayon-react-components'
import { $Any } from '@types'

import DraggableAttributeEnumItem from './DraggableAttributeEnumItem'
import * as Styled from './DraggableAttributeEnum.styled'
import useDraggable from './hooks/useDraggable'

export type AttributeData = {
  id: string,
  isExpanded: boolean
  label: string
  value: string
  color?: string
  icon?: string
  isLabelFocused: boolean
  hasPreselectedLabel: boolean
  isIconEnabled: boolean
  isColorEnabled: boolean
}

export type NormalizedData = {
  label: string
  value: string
  color?: string
  icon?: string
}

const creator = (): AttributeData => ({
  id: uniqueId(),
  isExpanded: true,
  label: '',
  value: '',
  isLabelFocused: true,
  hasPreselectedLabel: false,
  isIconEnabled: false,
  isColorEnabled: false,
})

const appendOrUpdateNumericSuffix = (value: string, separator: string) => {
  const tokens = value.split(separator)
  const lastToken = tokens[tokens.length - 1]
  if (!isNaN(Number(lastToken))) {
    return [...tokens.splice(-1), parseInt(lastToken) + 1].join(separator)
  }

  return value + separator + '2'
}

const normalize = (data: AttributeData[]): NormalizedData[] => {
  let values: string[] = []
  return data
    .filter((item) => item.label !== '' && item.value !== '')
    .map(({ label, value, icon, color, isIconEnabled, isColorEnabled }) => {
      let normalizedValue = value
      if (values.includes(value)) {
        normalizedValue = appendOrUpdateNumericSuffix(value, '-')
      }
      return {
        label,
        value: normalizedValue,
        icon: isIconEnabled ? icon : undefined,
        color: isColorEnabled ? color : undefined,
      }
    })
}

const denormalize = (data: NormalizedData[]): AttributeData[] => {
  return data.map(({ label, value, icon, color }) => {
    return {
      id: uniqueId(),
      isExpanded: false,
      label,
      value,
      icon: icon,
      color: color,
      isLabelFocused: false,
      hasPreselectedLabel: false,
      isIconEnabled: icon !== '' && icon !== null,
      isColorEnabled: color !== '' && color !== null,
    }
  })
}

const DraggableAttributeEnum = ({ values, syncHandler }: { values: $Any; syncHandler: $Any }) => {
  const {
    items,
    handleAddItem,
    handleRemoveItem,
    handleChangeItem,
    handleDuplicateItem,
    handleDraggableEnd,
  } = useDraggable<AttributeData, NormalizedData>({
    creator,
    initialData: denormalize(values),
    syncHandler,
    normalizer: normalize,
  })

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItemId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedItemId(null)
    handleDraggableEnd(event)
  }

  const [draggedItemId, setDraggedItemId] = useState<string | null>()
  let draggedItem
  if (draggedItemId) {
    draggedItem = items.find((item) => item.id === draggedItemId)
  }

  return (
    <>
      <Styled.EnumListWrapper>
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((item, idx) => (
              <DraggableAttributeEnumItem
                key={`DraggableAttributeEnum_${item.id}`}
                item={item}
                isBeingDragged={item.id === draggedItemId}
                onChange={handleChangeItem(idx)}
                onRemove={handleRemoveItem(idx)}
                onDuplicate={() =>
                  handleDuplicateItem(idx,
                    {
                    isLabelFocused: true,
                    hasPreselectedLabel: true,
                    label: appendOrUpdateNumericSuffix(items[idx].label, ' '),
                    value: appendOrUpdateNumericSuffix(items[idx].value, '-'),
                  })
                }
              />
            ))}
          </SortableContext>

          {createPortal(
            <DragOverlay style={{}}>
              {draggedItem && <DraggableAttributeEnumItem item={draggedItem} />}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>

        <Button
          icon="add"
          variant="text"
          onClick={handleAddItem}
          style={{ display: 'flex', justifyContent: 'start' }}
        >
          Add new item
        </Button>
      </Styled.EnumListWrapper>
    </>
  )
}

export default DraggableAttributeEnum