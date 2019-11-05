// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var SETTINGS_KEY = "settings";

var CURRENT_VERSION = '1.3.6.003';

var LAST_CHANGED_ON = 'November 4, 2019 18:20';

var SENDERS_LIFE_IN_HOURS = 2;

var THREAD_LIFE_IN_DAYS = 2;

var MAX_ALLOWED_SETTING_SIZE = 480000;


/**
 * clear settings to default again
 */
function clear_settings() {
    var settings = getSettingsForUser();
    if (DEBUG) {
        console.info(' old user settings  is ' , settings);
    }
    settings = {
        responses: [],
        timezone: null,
        b_is_on: false,
        lable_to_use: null,
        sheet_id: null,
        added_trigger: null
    };
    if (DEBUG) {
        console.info(' cleared user settings  is ' , settings);
    }
    updateSettingsForUser(settings);
}
/**
 * Get the effective settings for the current user.
 *
 * @return {Object}
 */
function getSettingsForUser() {
  var savedSettings = cachedPropertiesForUser_().get(SETTINGS_KEY, {});
  var settings =  _.defaults(savedSettings, {
    responses: [],
    timezone: null,
    b_is_on: false,
      lable_to_use: null,
      sheet_id: null,
      added_trigger: null
  });

  //   log_me('start dump (v3) of original settings');
  //   log_me(JSON.stringify(settings));
  //   log_me('end dump (v3) of original settings');
  //
   var new_settings = trim_and_convert_settings(settings);
  //   log_me('start dump (v3) of new settings');
  //   log_me(JSON.stringify(new_settings));
  //   log_me('end dump (v3) of new settings');
  return new_settings;
}

/**
 * Save the user's settings.
 *
 * @param {Object} settings - User settings to save.
 */
function updateSettingsForUser(settings) {
  cachedPropertiesForUser_().put(SETTINGS_KEY, settings);
}

/**
 * Deletes saved settings.
 */
function resetSettingsForUser() {
  cachedPropertiesForUser_().clear(SETTINGS_KEY);
}

/**
 * Prototype object for cached access to script/user properties.
 */
var cachedPropertiesPrototype = {
  /**
  * Retrieve a saved property.
  *
  * @param {string} key - Key to lookup
  * @param {Object} defaultValue - Value to return if no value found in storage
  * @return {Object} retrieved value
  */
  get: function(key, defaultValue) {
    var value = this.cache.get(key);
    if (!value) {
      value = this.properties.getProperty(key);
      if (value) {
        this.cache.put(key, value);
      }
    }
    if (value) {
      return JSON.parse(value);
    }
    return defaultValue;
  },

  /**
  * Saves a value to storage.
  *
  * @param {string} key - Key to identify value
  * @param {Object} value - Value to save, will be serialized to JSON.
  */
  put: function(key, value) {
    var serializedValue = JSON.stringify(value);
    this.cache.remove(key);
    this.properties.setProperty(key, serializedValue);
  },

  /**
  * Deletes any saved settings.
  *
  * @param {string} key - Key to identify value
  */
  clear: function(key) {
    this.cache.remove(key);
    this.properties.deleteProperty(key);
  }
};

/**
 * Gets a cached property instance for the current user.
 *
 * @return {CachedProperties}
 */
function cachedPropertiesForUser_() {
  return _.assign(Object.create(cachedPropertiesPrototype), {
    properties: PropertiesService.getUserProperties(),
    cache: CacheService.getUserCache()
  });
}
