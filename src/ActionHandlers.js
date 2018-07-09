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

/**
 * Collection of functions to handle user interactions with the add-on.
 *
 * @constant
 */
var ActionHandlers = {
  /**
   * Displays the meeting search card.
   *
   * @param {Event} e - Event from Gmail
   * @return {GoogleAppsScript.Card.Card}
   */
    showMain: function(e) {
        var settings = getSettingsForUser();

        var message = getCurrentMessage(e);


      if (DEBUG) {
          console.info('Params for show Main is ' , e);
          console.info('Settings are ' , settings);
          console.info('message is ' , message);
      }

        var card = buildMainCard(e);
        return card;
  },

    /**
     * Shows the user settings card.
     * @param {Event} e - Event from Gmail
     * @return {GoogleAppsScript.Card.UniversalActionResponse}
     */
    showSettings: function(e) {
        var settings = getSettingsForUser();
        if (DEBUG) {
            console.info('Params for show settings is ' , e);
            console.info('User Settings are ' , settings);
        }

        var card = createMainSettingCard();
        return CardService.newUniversalActionResponseBuilder()
            .displayAddOnCards([card])
            .build();
    },

    /**
     * Shows the form to create a new response.
     * @param {Event} e - Event from Gmail
     * @return {GoogleAppsScript.Card.Card}
     */
    newResponse: function(e) {
        var settings = getSettingsForUser();
        getCurrentMessage(e);
        if (DEBUG) {
            console.info('Params for new response is ' , e);
            console.info('user settigns  is ' , settings);
        }

        var card =buildEditResponseCard(e,{day_of_week:'Tuesday',startHour:-1,startMinute:-1,endHour:-1,endMinute: -1,state: ''});
        return card;
    },

    /**
     **
     * Shows the form to create a new response.
     * @param {Event} e - Event from Gmail
     * @return {GoogleAppsScript.Card.Card}
     */
    saveResponse: function(e) {
        var settings = getSettingsForUser();
        if (DEBUG) {
            console.info('Params for new response is ' , e);
            console.info(' old user settigns  is ' , settings);
        }

        var response = {
            day_of_week: e.formInput.day_of_week,
            response_name: e.formInput.response_name ? e.formInput.response_name : null ,
            start_hour: parseInt(e.formInput.start_hour),
            start_minute: parseInt(e.formInput.start_minute),
            end_hour: parseInt(e.formInput.end_hour),
            end_minute: parseInt(e.formInput.end_minute),
            draft_id: e.formInput.draft_id,
            filter: null,
            star_action: null,
            labels: null
        };

        if (e.userTimezone) {
            settings.timezone = {id:e.userTimezone.id, offset: e.userTimezone.offSet};
            settings.responses.push(response);
        } else {
            settings.timezone = {id:Session.getScriptTimeZone(), offset: null};
        }

        updateSettingsForUser(settings);

        if (DEBUG) {
            console.info(' new user settigns  is ' , settings);
        }

        var card =buildMainCard(e);
        return card;
    },



};
