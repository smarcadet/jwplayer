// TODO: move to providers/utils

// It's DVR if the duration is above the minDvrWindow, Live otherwise
export const isDvr = function (duration, minDvrWindow) {
    return Math.abs(duration) >= Math.max(minDvrWindow, 0);
};

// Determine the adaptive type - Live, DVR, or VOD
// Duration can be positive or negative, but minDvrWindow should always be positive
export const streamType = function(duration, minDvrWindow) {
    var _minDvrWindow = (minDvrWindow === undefined) ? 120 : minDvrWindow;
    var streamType = 'VOD';

    if (duration === Infinity) {
        // Live streams are always Infinity duration
        streamType = 'LIVE';
    } else if (duration < 0) {
        streamType = isDvr(duration, _minDvrWindow) ? 'DVR' : 'LIVE';
    }

    // Default option is VOD (i.e. positive or non-infinite)
    return streamType;
};
