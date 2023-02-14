import React from 'react'
import PropTypes from 'prop-types'
import { TileStyled } from './ListStatsTile'
import styled from 'styled-components'
import ProgressBar from './ProgressBar'

const HeaderStyled = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 4px;
  h3 {
    flex: 1;
  }

  & > * {
    white-space: nowrap;
  }
`

const ProgressStyled = styled(TileStyled)`
  flex-direction: column;
  gap: 8px;
  overflow: hidden;

  &:hover {
    background-color: var(--color-grey-01);
  }
`

const ProgressTile = ({
  title,
  subTitle,
  icon,
  onClick,
  isLoading,
  values = [],
  backgroundColor,
  onProgressClick,
}) => {
  return (
    <ProgressStyled onClick={onClick}>
      <HeaderStyled>
        {icon && <span className="material-symbols-outlined">{icon}</span>}
        <h3>{isLoading ? '' : title}</h3>
        <span>{isLoading ? '' : subTitle}</span>
      </HeaderStyled>
      {!!values.length && (
        <ProgressBar
          values={values}
          backgroundColor={backgroundColor}
          isLoading={isLoading}
          onClick={onProgressClick}
        />
      )}
    </ProgressStyled>
  )
}

ProgressTile.propTypes = {
  title: PropTypes.string.isRequired,
  subTitle: PropTypes.string,
  icon: PropTypes.string,
  onClick: PropTypes.func,
  backgroundColor: PropTypes.string,
  isLoading: PropTypes.bool,
  onProgressClick: PropTypes.func,
  values: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.number.isRequired,
        color: PropTypes.string,
        label: PropTypes.string.isRequired,
      }),
    ),
  ]),
}

export default ProgressTile
