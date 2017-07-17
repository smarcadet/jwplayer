define([
    'plugins/plugins',
    'playlist/loader',
    'utils/scriptloader',
    'utils/embedswf',
    'utils/constants',
    'utils/underscore',
    'utils/helpers',
    'events/events',
    'controller/controls-loader',
    'polyfills/promise',
    'polyfills/base64'
], function(plugins, PlaylistLoader, ScriptLoader, EmbedSwf, Constants, _, utils, events, ControlsLoader) {

    var _pluginLoader;
    var _playlistLoader;

    function getQueue() {
        var Components = {
            LOAD_PLUGINS: {
                method: _loadPlugins,
                // Plugins require JavaScript Promises
                depends: []
            },
            LOAD_XO_POLYFILL: {
                method: _loadIntersectionObserverPolyfill,
                depends: []
            },
            LOAD_PLAYLIST: {
                method: _loadPlaylist,
                depends: []
            },
            LOAD_CONTROLS: {
                method: _loadControls,
                depends: []
            },
            SETUP_VIEW: {
                method: _setupView,
                depends: [
                    'LOAD_XO_POLYFILL'
                ]
            },
            INIT_PLUGINS: {
                method: _initPlugins,
                depends: [
                    'LOAD_PLUGINS',
                    // Plugins require jw-overlays to setup
                    'SETUP_VIEW'
                ]
            },
            FILTER_PLAYLIST: {
                method: _filterPlaylist,
                depends: [
                    'LOAD_PLAYLIST'
                ]
            },
            SET_ITEM: {
                method: _setPlaylistItem,
                depends: [
                    'INIT_PLUGINS',
                    'FILTER_PLAYLIST'
                ]
            },
            DEFERRED: {
                method: _deferred,
                depends: []
            },
            SEND_READY: {
                method: _sendReady,
                depends: [
                    'LOAD_CONTROLS',
                    'SET_ITEM',
                    'DEFERRED'
                ]
            }
        };

        return Components;
    }

    function _deferred(resolve) {
        setTimeout(resolve, 0);
    }

    function _loadIntersectionObserverPolyfill(resolve) {
        if ('IntersectionObserver' in window &&
            'IntersectionObserverEntry' in window &&
            'intersectionRatio' in window.IntersectionObserverEntry.prototype) {
            resolve();
        } else {
            require.ensure(['intersection-observer'], function (require) {
                require('intersection-observer');
                resolve();
            }, 'polyfills.intersection-observer');
        }
    }

    function _loadPlugins(resolve, _model) {
        window.jwplayerPluginJsonp = plugins.registerPlugin;
        _pluginLoader = plugins.loadPlugins(_model.get('id'), _model.get('plugins'));
        _pluginLoader.on(events.COMPLETE, resolve);
        _pluginLoader.on(events.ERROR, _.partial(_pluginsError, resolve));
        _pluginLoader.load();
    }

    function _initPlugins(resolve, _model, _api) {
        delete window.jwplayerPluginJsonp;
        _pluginLoader.setupPlugins(_api, _model);
        resolve();
    }

    function _pluginsError(resolve, evt) {
        error(resolve, 'Could not load plugin', evt.message);
    }

    function _loadPlaylist(resolve, _model) {
        var playlist = _model.get('playlist');
        if (_.isString(playlist)) {
            _playlistLoader = new PlaylistLoader();
            _playlistLoader.on(events.JWPLAYER_PLAYLIST_LOADED, function(data) {
                _model.attributes.feedData = data;
                _model.attributes.playlist = data.playlist;
                resolve();
            });
            _playlistLoader.on(events.JWPLAYER_ERROR, _.partial(_playlistError, resolve));
            _playlistLoader.load(playlist);
        } else {
            resolve();
        }
    }

    function _filterPlaylist(resolve, _model, _api, _view, _setPlaylist) {
        // Performs filtering
        var success = _setPlaylist(_model.get('playlist'), _model.get('feedData'));

        if (success) {
            resolve();
        } else {
            _playlistError(resolve);
        }
    }

    function _playlistError(resolve, evt) {
        if (evt && evt.message) {
            error(resolve, 'Error loading playlist', evt.message);
        } else {
            error(resolve, 'Error loading player', 'No playable sources found');
        }
    }

    function _setupView(resolve, _model, _api, _view) {
        _model.setAutoStart();
        _view.setup();
        resolve();
    }

    function _setPlaylistItem(resolve, _model) {
        _model.once('itemReady', resolve);
        _model.setItemIndex(_model.get('item'));
    }

    function _sendReady(resolve) {
        resolve({
            type: 'complete'
        });
    }

    function _loadControls(resolve, _model, _api, _view) {
        if (!_model.get('controls')) {
            resolve();
            return;
        }

        ControlsLoader.load()
            .then(function (Controls) {
                _view.setControlsModule(Controls);
                resolve();
            })
            .catch(function (reason) {
                error(resolve, 'Failed to load controls', reason);
            });
    }

    function error(resolve, msg, reason) {
        resolve({
            type: 'error',
            msg: msg,
            reason: reason
        });
    }

    return {
        getQueue: getQueue,
        error: error
    };
});
