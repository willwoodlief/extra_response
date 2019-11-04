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
      
// Need ScriptApp OAUTH permission to create automatic triggers. Currently not supported in Gmail Addons
//        init_trigger();

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
//        return card;
        return CardService.newUniversalActionResponseBuilder()
            .displayAddOnCards([card])
            .build();
    },

    openSpreadsheet: function(e) {

        var sheet_data = get_spreadsheet_data();
        return CardService.newUniversalActionResponseBuilder()
            .setOpenLink(CardService.newOpenLink()
                .setUrl(sheet_data.url))
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
            console.info('user settings that are used in creating this new response  is ' , settings);
        }

        var card =buildEditResponseCard(e,{day_of_week:'Tuesday',startHour:-1,startMinute:-1,endHour:-1,
            endMinute: -1,thread_id:null,spreadsheet_entry:null,draft_snippit:'',slot: '',response_name:'',
            star_action:false,labels: '',filter:''
        });
        return card;
    },

    deleteResponse: function(e) {
        var card = null;
        var settings = getSettingsForUser();
        var responses = settings.responses;
        var index = parseInt(e.parameters.state);
        
       if (DEBUG) {
            console.info('Params for deleted response is ' , e);
            console.info('response to edit is (index ) ' , index);
        }

        if (index >= 0) {
            if (index >= responses.length) {
                throw new Error("state has index of " + index + " but responses only have " + responses.length);
            }
        } else {
             card =buildMainCard(e);
            return card;
        }
        settings.responses[index] = null;
        updateSettingsForUser(settings);

         card =buildMainCard(e);
        return card;
    },


    editResponse: function(e) {
        var settings = getSettingsForUser();
        var responses = settings.responses;
        var index = parseInt(e.parameters.state);
        if (index >= 0) {
            if (index >= responses.length) {
                throw new Error("state has index of " + index + " but responses only have " + responses.length);
            }
        } else {
            throw new Error("No state associated with the edit button");
        }
        var response = responses[index];
        response.slot = index;
        if (DEBUG) {
            console.info('Params for edit response is ' , e);
            console.info('response to edit is (index , response) ' , index, response);
        }

        var card =buildEditResponseCard(e,response);
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
        var responses = settings.responses;
        var index = responses.length;
        if (e.parameters.state !== '') {
            index = parseInt(e.parameters.state);
            if (index >= 0) {
                if (index >= responses.length) {
                    throw new Error("state has index of " + index + " but responses only have " + responses.length);
                }
            }
        }


        if (DEBUG) {
            console.info('Params for save response is ' , e);
            console.info('old user settings  is ' , settings);
            console.info('thread id is  ', e.formInput.thread_id);
            console.info('slot is  ', index);
        }


        var draft_snippit = null;

        if (e.formInput.thread_id) {
            draft_snippit = get_draft_snippit( get_draft_info_from_thread(e.formInput.thread_id));
        }

        var star_action = !! e.formInput.star_action ;

        var rem_last_time_check = null;
        if (settings.responses[index]) {
            rem_last_time_check = settings.responses[index].last_time_check_ts;
        }

        /**
         *
         * @type {ResponseSetting}
         */


        var response = {
            day_of_week: e.formInput.day_of_week,
            response_name: e.formInput.response_name ? e.formInput.response_name : '' ,
            startHour: parseInt(e.formInput.start_hour),
            startMinute: parseInt(e.formInput.start_minute),
            endHour: parseInt(e.formInput.end_hour),
            endMinute: parseInt(e.formInput.end_minute),
            thread_id: e.formInput.thread_id,
            spreadsheet_entry: e.formInput.spreadsheet_entry,
            draft_snippit: draft_snippit,
            filter: e.formInput.filter ? e.formInput.filter : '' ,
            star_action: star_action,
            labels: e.formInput.labels ? e.formInput.labels : '' ,
            slot: index,
            last_time_check_ts: rem_last_time_check,
            forward : e.formInput.forward ? e.formInput.forward : '',
            threads_responded_to: {},
            senders_responded_to: {}
        };
      
        if (e.parameters.state === '') {
          response.slot = '';
        }

        var error_message = validate_response(response);
        if (error_message) {
            var do_again_card =buildEditResponseCard(e,response,error_message);
            return do_again_card;
        } else {
            if (e.parameters.state === '') {
                   response.slot = index;
            }
            if (e.userTimezone) {
                settings.timezone = {id:e.userTimezone.id, offset: e.userTimezone.offSet};
                settings.responses[index] = response;
            } else {
                settings.timezone = {id:Session.getScriptTimeZone(), offset: null};
            }

            if (DEBUG) {
                console.info(' updating user settings ' , settings);
            }
            
            updateSettingsForUser(settings);



            var card =buildMainCard(e);
            return card;
        }


    },



};

/**
 *
 * @param {ResponseSetting} response
 * @return {string|null}
 */
function validate_response(response) {
    if (DEBUG) {
        console.info('validating response ', response);
    }
    if (! (response.thread_id || response.spreadsheet_entry )) {return "Need to Set a Draft or a Spreadsheet Row"}
    if ( response.thread_id && response.spreadsheet_entry ) {return "Cannot have both a Draft and a Spreadsheet Row"}
    if ( !response.response_name ) {return "Need to have the name of the response"}

    //check to see if end time less than or equal to start time
    var start = response.startHour + (response.startMinute/100);
    var end = response.endHour + (response.endMinute/100);
    if (DEBUG) {
        console.info('time of day to decimal ', start,end);
    }
    if (end <= start) {
        return "The ending time needs to be later than the starting time";
    }

    if (response.labels) {
        //check labels
        var these_labels = response.labels.split(/(\s+)/);
        var real_labels = getLabels();
        for(var k = 0; k < these_labels.length; k++) {
            var a_label = these_labels[k];
            if (!a_label.trim()) {continue;}
            if (!real_labels.hasOwnProperty(a_label)) {
                return "The label of " + a_label + " does not exist yet in your gmail, please add it and refresh the page to try again"
            }
        }
    }

    if (response.forward) {
        //check if valid email format
        if (!validateEmail(response.forward)) {
            return "this [" +response.forward + "] is not seen as a valid email";
        }
    }


    return null;
}




function handleSettingsLabelChange(e) {
    var settings = getSettingsForUser();
    var label = e.formInput.lable_to_use;
    settings.lable_to_use = label;
    updateSettingsForUser(settings);
}

function handlePluginOnCheckboxChange(e) {
    var settings = getSettingsForUser();
    var b_on = !! e.formInput.settings_binary ;
    if (DEBUG) {
        console.info(' b on raw ', b_on);
    }
    settings.b_is_on = b_on;
    updateSettingsForUser(settings);

}
