//  Created by Gregory Kramida (https://github.com/Algomorph) on 1/26/21.
//  Copyright (c) 2021 Gregory Kramida
//  Based on: https://chrome.google.com/webstore/detail/time-tracker/mokmnbikneoaenmckfmgjgjimphfojkd

let tabTimeTracker = {};

(function () {
    /** @type {Date|null}*/
    this._startTime = null;

    /** @type {Map.<number, number>}*/
    this._trackedTabs = new Map();

    this._currentlyTrackedTabId = null;
    this._idle = false;
    this._updateTimePeriodInMinuts = 1;

    this.startTrackingActiveTab = function (callbackOnTabRemoved) {
        let self = this;
        chrome.tabs.query({active: true, lastFocusedWindow: true},
            function (tabs) {
                if (tabs.length === 1) {
                    let trackedTabId = tabs[0].id;
                    chrome.windows.get(tabs[0].windowId,
                        function (win) {
                            if (!win.focused) {
                                // something went wrong, window needs to have been focused at this point
                                self._setCurrentFocus(null);
                                return;
                            }
                            self._trackedTabs.set(trackedTabId, 0);
                            chrome.tabs.onRemoved.addListener(
                                function _listener(tabId, removeInfo) {
                                    if(tabId === trackedTabId){
                                        const tabActiveDuration = self._trackedTabs.get(tabId);
                                        if(tabId === self._currentlyTrackedTabId){
                                            self._setCurrentFocus(null);
                                        }
                                        self._trackedTabs.delete(tabId);
                                        callbackOnTabRemoved(tabActiveDuration);
                                        chrome.tabs.onRemoved.removeListener(_listener);
                                    }
                                }
                            );
                            self._setCurrentFocus(trackedTabId);
                        }
                    );
                }
            }
        );
    }


    this._updateCurrentTabTime = function () {
        if (!this._currentlyTrackedTabId || !this._startTime) {
            return;
        }
        let delta = new Date() - this._startTime;

        if (delta / 1000 / 60 > 2 * this._updateTimePeriodInMinuts) {
            // time is too long to be realistic (since we're also periodically updating using an alarm object)
            // something went wrong, return.
            return;
        }
        if (this._trackedTabs.has(this._currentlyTrackedTabId)) {
            this._trackedTabs.set(this._currentlyTrackedTabId, this._trackedTabs.get(this._currentlyTrackedTabId) + delta);
        }
    }

    this._setCurrentFocus = function (tabId) {
        this._updateCurrentTabTime();
        if (this._trackedTabs.has(tabId)) {
            this._startTime = new Date();
            this._currentlyTrackedTabId = tabId;
        } else {
            this._startTime = null;
            this._currentlyTrackedTabId = null;
        }
    }

    /**
     * Get active tab and set focus to it.
     * @private
     */
    this._setFocusToActiveTab = function () {
        let self = this;
        chrome.tabs.query({active: true, lastFocusedWindow: true},
            function (tabs) {
                if (tabs.length === 1) {
                    /*
                    * Is the tab in the currently focused window? If not, assume Chrome
                    * is out of focus. Although we ask for the lastFocusedWindow, it's
                    * possible for that window to go out of focus quickly. If we don't do
                    * this, we risk counting time towards a tab while the user is outside of
                    * Chrome altogether.
                    * */
                    let tabId = tabs[0].id;
                    chrome.windows.get(tabs[0].windowId,
                        function (win) {
                            if (!win.focused) {
                                tabId = null;
                            }
                            self._setCurrentFocus(tabId);
                        }
                    );
                }
            }
        );
    }

    let self = this;

    // ==== Add listeners ====
    chrome.tabs.onUpdated.addListener(
        function (tabId, changeInfo, tab) {
            /*
            * This tab has updated, but it may not have focus.
            * Try to set focus to the active tab id.
            * */
            self._setFocusToActiveTab();
        }
    );
    chrome.tabs.onActivated.addListener(
        function (activeInfo) {
            /*
            * A tab is activated (while window has focus): try to set focus to it.
            * */
            self._setCurrentFocus(activeInfo.tabId);
        }
    );

    chrome.tabs.onFocusChanged.addListener(
        function (windowId) {
            /*
             * If window is out of focus, set focus to null.
             * If window receives focus, set focus to active tab.
             */
            if (windowId === chrome.windows.WINDOW_ID_NONE) {
                self._setCurrentFocus(null);
                return;
            }
            self._setFocusToActiveTab();
        }
    );

    chrome.idle.onStateChanged.addListener(
        function (idleState) {
            if (idleState === "active") {
                self._idle = false;
                self._setFocusToActiveTab();
            } else {
                self._idle = true;
                self._setCurrentFocus(null);
            }
        }
    );

    chrome.alarms.create(
        "updateTime",
        {periodInMinutes: this._updateTimePeriodInMinuts}
    );
    chrome.alarms.onAlarm.addListener(
        function (alarm) {
            if (alarm.name === "updateTime") {
                /*
                 * These events gets fired on a periodic basis and aren't triggered
                 * by a user event, like the tabs/windows events. Because of that,
                 * we need to ensure the user is not idle or we'll track time for
                 * the current tab forever.
                 * */
                if (!self._idle) {
                    self._setFocusToActiveTab();
                }
                /* Force a check of the idle state to ensure that we transition
                 * back from idle to active as soon as possible. */
                chrome.idle.queryState(60, function (idleState) {
                    if (idleState === "active") {
                        self._idle = false;
                    } else {
                        self._idle = true;
                        self._setCurrentFocus(null);
                    }
                });
            }
        }
    );


}).apply(tabTimeTracker);