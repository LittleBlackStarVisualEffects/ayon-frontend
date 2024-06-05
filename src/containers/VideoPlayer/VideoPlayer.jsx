import { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'

import VideoOverlay from './VideoOverlay'
import Trackbar from './Trackbar'
import VideoPlayerControls from './VideoPlayerControls'
import EmptyPlaceholder from '/src/components/EmptyPlaceholder/EmptyPlaceholder'

const VideoPlayerContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;

  gap: 6px;

  video {
    object-fit: fill !important;
  }

  .video-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    background-color: black;

    .video-wrapper {
      position: relative;
    }
  }

  .controls-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    width: 100%;
    gap: 6px;
    padding-bottom: 6px;
  }
`

const VideoPlayer = ({ src, frameRate, aspectRatio }) => {
  const videoRef = useRef(null)
  const videoRowRef = useRef(null)

  const [preferredInitialPosition, setPreferredInitialPosition] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bufferedRanges, setBufferedRanges] = useState([])
  const [loadError, setLoadError] = useState(null)

  const [showOverlay, setShowOverlay] = useState(false)
  const [loop, setLoop] = useState(true)

  const [videoDimensions, setVideoDimensions] = useState({
    width: 600,
    height: 400,
  })

  useEffect(() => {
    if (!videoRowRef.current) return

    const updateVideoDimensions = () => {
      // DO NOT TOUCH THAT *0.95 ! IT'S AN IMPORTANT MAGIC!
      const clientWidth = videoRowRef.current.clientWidth * 0.95
      const clientHeight = videoRowRef.current.clientHeight * 0.95

      if (clientWidth / clientHeight > aspectRatio) {
        const width = clientHeight * aspectRatio
        const height = clientHeight
        setVideoDimensions({ width, height })
      } else {
        const width = clientWidth
        const height = clientWidth / aspectRatio
        setVideoDimensions({ width, height })
      }
    }

    const resizeObserver = new ResizeObserver(updateVideoDimensions)
    resizeObserver.observe(videoRowRef.current)
    return () => {
      if (!videoRowRef.current) return
      resizeObserver.unobserve(videoRowRef.current)
    }
  }, [videoRowRef])

  useEffect(() => {
    console.log('src changed', src)
    if (!videoRef.current) return
    videoRef.current.load()
  }, [src, videoRef])

  useEffect(() => {
    if (!videoRef.current) return
    // TODO:
    const frameLength = 0.04
    const updateTime = () => {
      const actualDuration = videoRef.current.duration
      if (actualDuration !== duration) {
        setDuration(actualDuration)
      }
      const actualTime = Math.min(videoRef.current?.currentTime || 0, actualDuration - frameLength)
      if (isPlaying) {
        setCurrentTime(actualTime)
        setPreferredInitialPosition(actualTime)
        setTimeout(() => requestAnimationFrame(updateTime), 40)
      } else {
        setCurrentTime(actualTime)
        setPreferredInitialPosition(actualTime)
      }
    }
    updateTime()
  }, [videoRef, isPlaying, duration])

  const handleLoad = (e) => {
    console.log('loaded', e)
    setIsPlaying(false)
    setCurrentTime(0)
    setBufferedRanges([])
  }

  const handleCanPlay = () => {
    // Sets the current time of the video to a preferred initial position.
    // When the video is loaded, it will start playing from this position.
    if (preferredInitialPosition >= videoRef.current.duration) return
    if (isNaN(preferredInitialPosition)) return
    if (videoRef.current.currentTime > 0 || preferredInitialPosition === 0) return
    if (videoRef.current.currentTime === preferredInitialPosition) return

    if (isNaN(preferredInitialPosition)) return
    setCurrentTime(preferredInitialPosition)
    videoRef.current.currentTime = preferredInitialPosition
  }

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration)
    const width = videoRef.current.clientWidth
    const height = videoRef.current.clientHeight
    setVideoDimensions({ width, height })
    setIsPlaying(!videoRef.current.paused)
    setBufferedRanges([])
  }

  const handleProgress = (e) => {
    // create a list of buffered time ranges
    const buffered = e.target.buffered
    if (!buffered.length) return
    const bufferedRanges = []
    for (var i = 0; i < buffered.length; i++) {
      const r = { start: buffered.start(i), end: buffered.end(i) }
      bufferedRanges.push(r)
    }
    setBufferedRanges(bufferedRanges)
  }

  const handleScrub = (newTime) => {
    videoRef.current.pause()
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
    setPreferredInitialPosition(newTime)
  }

  const handlePause = () => {
    setTimeout(() => {
      if (videoRef.current.paused) {
        console.log('Paused')
        setIsPlaying(false)
      }
    }, 100)
  }

  const handleEnded = () => {
    if (loop && isPlaying) {
      console.log('Ended, looping')
      videoRef.current.currentTime = 0
      videoRef.current.play()
    } else {
      console.log('Ended, not looping')
      setIsPlaying(false)
    }
  }

  const handleLoadError = (e) => {
    // check if the video is 404
    const code = e.target.error.code
    if (code === 4) {
      setLoadError({ code, message: 'No preview for this version' })
    } else {
      setLoadError({ code, message: 'Error loading video' })
    }
  }

  if (loadError) {
    return (
      <EmptyPlaceholder
        icon="hide_image"
        message={'This version has no previewable content.'}
        error={loadError.code !== 4 && loadError.message}
      />
    )
  }

  return (
    <VideoPlayerContainer>
      <div className="video-row video-container" ref={videoRowRef}>
        <div className="video-wrapper">
          <video
            ref={videoRef}
            width={videoDimensions.width}
            height={videoDimensions.height}
            src={src}
            onLoadedMetadata={handleLoadedMetadata}
            onProgress={handleProgress}
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={handlePause}
            onLoadedData={handleLoad}
            onCanPlay={handleCanPlay}
            onError={handleLoadError}
          />
          <VideoOverlay
            videoWidth={videoDimensions.width}
            videoHeight={videoDimensions.height}
            showOverlay={showOverlay}
          />
        </div>
      </div>

      <div className="trackbar-row">
        <Trackbar
          currentTime={currentTime}
          duration={duration}
          bufferedRanges={bufferedRanges}
          onScrub={handleScrub}
          frameRate={frameRate}
        />
      </div>

      <div className="controls-row">
        <VideoPlayerControls
          videoRef={videoRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          frameRate={frameRate}
          {...{ showOverlay, setShowOverlay, loop, setLoop }}
        />
      </div>
    </VideoPlayerContainer>
  )
}

export default VideoPlayer
