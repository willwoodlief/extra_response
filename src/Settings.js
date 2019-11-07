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

var CURRENT_VERSION = '1.3.7.014';

var LAST_CHANGED_ON = 'November 7, 2019 12:30';

var SENDERS_LIFE_IN_HOURS = 2;

var THREAD_LIFE_IN_DAYS = 2;

var MAX_ALLOWED_SETTING_SIZE = 480000;

var MAX_ALLOWED_KEY_SIZE = 8500;

var B_USE_NEW_HASHES = true;

var B_DEBUG_SETTINGS = false;


/**
 * clear settings to default again
 */
function clear_settings() {

    if (B_DEBUG_SETTINGS) {
        console.log("clear settings is called");
    }
    var settings = {
        responses: [],
        timezone: null,
        b_is_on: false,
        lable_to_use: null,
        sheet_id: null,
        added_trigger: null,
        response_slot_array: []
    };
    if (B_DEBUG_SETTINGS) {
        console.info(' cleared user settings  is ', settings);
    }
    updateSettingsForUser(settings);
}

/**
 *  pull from the different response keys and attach to the responses

 *
 *   if the response_slot_array is missing, then its the older save format, and do not do anything
 *
 *
 *   if the response_slot_array is found, then loop through each index to get the response key (response_x)
 *   and put in the responses array, which should be empty
 *
 * Get the effective settings for the current user.
 *
 * @return {UserSettings}
 */
function getSettingsForUser() {
    var savedSettings = cachedPropertiesForUser_().get(SETTINGS_KEY, {});

    if (B_DEBUG_SETTINGS) {
        var settings_value = JSON.stringify(savedSettings);
        console.log('getSettingsForUser: fresh settings is ', settings_value);
    }

    var settings = _.defaults(savedSettings, {
        responses: [],
        timezone: null,
        b_is_on: false,
        lable_to_use: null,
        sheet_id: null,
        added_trigger: null,
        response_slot_array: []
    });

    if (B_DEBUG_SETTINGS) {
        settings_value = JSON.stringify(savedSettings);
        console.log('getSettingsForUser: pre settings is ', settings_value);
    }

    //old style settings, re key slots
    if (settings.responses.length) {
        for (var m = 0; m < settings.responses.length; m++) {
            var convert = settings.responses[m];
            if (convert) {
                convert.slot = m;
            }
        }
    }

    if (settings.hasOwnProperty('response_slot_array') && Array.isArray(settings.response_slot_array)) {
        //get the responses
        for (var i = 0; i < settings.response_slot_array.length; i++) {
            var response_key = 'response_' + settings.response_slot_array[i];

            if (B_DEBUG_SETTINGS) {
                console.log('getSettingsForUser: loading response key of  ', response_key);
            }
            var saved_response = cachedPropertiesForUser_().get(response_key, {});
            saved_response.response_key = response_key;
            settings_value = JSON.stringify(saved_response);
            if (B_DEBUG_SETTINGS) {
                console.log('getSettingsForUser: attaching response of key of  ', settings_value);
            }
            settings.responses.push(saved_response);
        }
    }

    if (B_USE_NEW_HASHES) {
        var new_settings = trim_and_convert_settings(settings);

        if (DEBUG) {
            settings_value = JSON.stringify(new_settings);
            console.log('getSettingsForUser loaded:  ', settings_value);
        }
        return new_settings;
    } else {
        return settings;
    }


}

/**
 * Save the user's settings.
 *
 *    recreate/reset (or set in the first place) the response_slot_array from the response array
 *    (values can be null in the array from deleting so skip over them),
 *    detach the responses from the settings
 *    and save each under the key response_x
 * update, or create,
 * @param {UserSettings} settings - User settings to save.
 */
function updateSettingsForUser(settings) {

    settings.response_slot_array = [];
    var settings_value = JSON.stringify(settings);
    if (B_DEBUG_SETTINGS) {
        console.log('updateSettingsForUser starting with  ', settings_value);
    }

    var number_extra_to_remove = 0;
    var counter = 0;
    for (var i = 0; i < settings.responses.length; i++) {
        var response = settings.responses[i];
        if (!response) {
            number_extra_to_remove++;
            continue;
        }

        response.slot = counter;

        settings.response_slot_array.push(counter);

        response.response_key = 'response_' +counter;
        counter++;


        if (B_DEBUG_SETTINGS) {
            var json_value = JSON.stringify(response);
            console.log('updateSettingsForUser response setting key is ', response.response_key, json_value);
        }

        cachedPropertiesForUser_().put(response.response_key, response);
    }

    if (number_extra_to_remove) {
        for ( i = 0; i < number_extra_to_remove; i++) {
            var unused_key = 'response_' +counter;
            counter++;
            if (DEBUG) {
                console.log("Remove unused key: " + unused_key );
            }
            cachedPropertiesForUser_().clear(unused_key);
        }
    }

    settings.responses = [];
    if (B_DEBUG_SETTINGS) {
        settings_value = JSON.stringify(settings);
        console.log('updateSettingsForUser final saved settings is ', settings_value);
    }
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
    get: function (key, defaultValue) {
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
    put: function (key, value) {
        var serializedValue = JSON.stringify(value);
        this.cache.remove(key);
        this.properties.setProperty(key, serializedValue);
    },

    /**
     * Deletes any saved settings.
     *
     * @param {string} key - Key to identify value
     */
    clear: function (key) {
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
