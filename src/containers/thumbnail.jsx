import { useState } from 'react'
import styled from 'styled-components'
import getShimmerStyles from '../styles/getShimmerStyles'

const ThumbnailStyled = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
  aspect-ratio: 1.77;
  overflow: hidden;
  border-radius: 3px;
  margin: auto;
  max-width: 250px;

  /* icon */
  span {
    position: absolute;
    font-size: 4rem;
    user-select: none;
    display: flex;
    justify-content: center;
    align-items: center;
    inset: 0;
    background-color: #161616;
  }

  ${({ $shimmer }) => $shimmer && getShimmerStyles('var(--color-grey-01)', 'var(--color-grey-02)')}
`

const ImageStyled = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;

  /* ensures it always fills the parent */
  display: block;
  position: absolute;
  inset: 0;
`

const ImagePlaceholder = () => <span className="material-symbols-outlined">image</span>

const Thumbnail = ({
  projectName,
  entityType,
  entityId,
  style,
  entityUpdatedAt,
  isLoading,
  shimmer,
  className,
}) => {
  // Display image only when loaded to avoid flickering and displaying,
  // ugly border around the image (when it's not loaded yet)
  const [thumbLoaded, setThumbLoaded] = useState(false)

  const url = `/api/projects/${projectName}/${entityType}s/${entityId}/thumbnail`
  const queryArgs = `?updatedAt=${entityUpdatedAt}&token=${localStorage.getItem('accessToken')}`
  const isWrongEntity = ['task', 'product'].includes(entityType)

  return (
    <ThumbnailStyled style={style} className={className} $shimmer={isLoading && shimmer}>
      {!isLoading && <ImagePlaceholder />}
      {entityType && !(isWrongEntity || !entityId) && (
        <ImageStyled
          alt={`Entity thumbnail ${entityId}`}
          src={`${url}${queryArgs}`}
          style={{ display: thumbLoaded ? 'block' : 'none' }}
          onError={() => setThumbLoaded(false)}
          onLoad={() => setThumbLoaded(true)}
        />
      )}
    </ThumbnailStyled>
  )
}

export default Thumbnail
