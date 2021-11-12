import { getBandwidth } from "../network";
import { registerEvent } from "../chart";
import { computeBufferSize } from "../utils";

/**
 * Bind the player-tester to RxPlayer events
 * @param {Object} player - The RxPlayer instance
 * @param {HTMLMediaElement} mediaElement - The media element on which the
 * content plays.
 * @returns {Function} - returns a function to unsubscribe to binded events.
 */
export default function bindToRxPlayer(player, videoElement) {
  let currentTime = 0;
  player.addEventListener("audioBitrateChange", onAudioBitrateChange);
  player.addEventListener("videoBitrateChange", onVideoBitrateChange);
  player.addEventListener("playerStateChange", onPlayerStateChange);
  // player.addEventListener("positionUpdate", checkCurrentTime);

  const currentTimeId = setInterval(onCurrentTimeChange, 1000);
  const rateChange = setInterval(onPlaybackRateChange, 1000);

  const liveEdge = setInterval(onDetectLiveEdge, 100);

  function onDetectLiveEdge() {
    const len = videoElement.buffered.length;
    console.warn("RXPLAYER", videoElement.buffered.end(len - 1));
  }

  const bandwidthItv = setInterval(async () => {
    await getBandwidth();
  }, 1000);

  const bufferSizeItv = setInterval(() => {
    const bufferSize = computeBufferSize(videoElement);
    registerEvent.bufferSize(bufferSize);
  }, 100);

  function onPlaybackRateChange() {
    registerEvent.playbackRate(videoElement.playbackRate);
  }

  function onCurrentTimeChange(time) {
    if (videoElement.currentTime === currentTime) {
      registerEvent.currentTime(0);
      return;
    }
    registerEvent.currentTime(1);
    currentTime = videoElement.currentTime;
  }

  function onAudioBitrateChange(bitrate) {
    registerEvent.audioBitrate(bitrate);
  }

  function onVideoBitrateChange(bitrate) {
    registerEvent.videoBitrate(bitrate);
  }

  async function onPlayerStateChange(state) {
    if (state === "LOADED") {
      await getBandwidth();
      videoElement.onclick = function () {
        if (player.getPlayerState() === "PLAYING") {
          player.pause();
        } else {
          player.play();
        }
      };
    } else if (state === "LOADING" || state === "STOPPED") {
      videoElement.onclick = undefined;
    }
  }

  return () => {
    clearInterval(liveEdge);
    clearInterval(currentTimeId);
    clearInterval(rateChange);
    clearInterval(bandwidthItv);
    clearInterval(bufferSizeItv);
    player.removeEventListener("playerStateChange", onPlayerStateChange);
    player.removeEventListener("audioBitrateChange", onAudioBitrateChange);
    player.removeEventListener("videoBitrateChange", onVideoBitrateChange);
    player.removeEventListener("positionUpdate", onCurrentTimeChange);
  };
}
