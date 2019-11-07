/**
 *
 * @param {string} key
 * @return {string|null}
 */
function get_spreadsheet_value(key) {
    var sheet_data = get_spreadsheet_data().data;
    for (var i = 0; i < sheet_data.length; i ++) {
        var row = sheet_data[i];
        var text = row[0];
        if (!text) {continue;}
        if (text === key ) {return row[2];}
    }
    return null;
}


function get_spreadsheet_data(){
    var settings = getSettingsForUser();
    var sheet = null;
    if (settings.sheet_id) {
        try {
            sheet = SpreadsheetApp.openById(settings.sheet_id);
        }
        catch(error ) {
            if (error.toString() === 'Exception: Bad value') {
                sheet =  SpreadsheetApp.create("Fexi Autoresponder Responses");
            } else {
                throw error;
            }
        }
    } else {
        sheet =  SpreadsheetApp.create("Fexi Autoresponder Responses");
    }


    if (!settings.sheet_id) {
        settings.sheet_id = sheet.getId();
        updateSettingsForUser(settings);
    }

    //redo header, just in case
    var range = sheet.getRange("A1:C1");
    var values = range.getValues();
    values[0][0] = "Name";
    values[0][1] = "Subject";
    values[0][2] = "Body";
    // Logger.log(values);
    range.setValues(values);
    var fontStyles = [
        [ "bold", "bold", "bold" ]
    ];
    range.setFontWeights(fontStyles);
    range = sheet.getRange("A2:C200");
    values = range.getValues();

    var data = {url:sheet.getUrl(),data: values};
    return data;

}

function getLabels() {

    var pageToken = null;
    var labelArray = [];
    do {
        // noinspection JSUnresolvedVariable
        var labelList = Gmail.Users.Labels.list('me', {
            pageToken: pageToken,
        });

        labelArray.push(labelList);
        // noinspection JSUnresolvedVariable
        pageToken = labelList.nextPageToken;
    } while (pageToken);

    var labelNames = {};
    for (var i in labelArray) {
        var innerArray = labelArray[i];

        for(var j in innerArray.labels) {
            if (innerArray.labels.hasOwnProperty(j)) {
                var label = innerArray.labels[j];
                labelNames[label.name] = label.id;

            }
        }

    }

    return labelNames;
}

function getLabelList() {

    var pageToken = null;
    var labelArray = [];
    do {
        // noinspection JSUnresolvedVariable
        var labelList = Gmail.Users.Labels.list('me', {
            pageToken: pageToken,
        });

        labelArray.push(labelList);
        // noinspection JSUnresolvedVariable
        pageToken = labelList.nextPageToken;
    } while (pageToken);

    var labelNames = [];
    for (var i in labelArray) {
        var innerArray = labelArray[i];

        for(var j in innerArray.labels) {
            if (innerArray.labels.hasOwnProperty(j)) {
                var label = innerArray.labels[j];
                if (label.type === 'user') {
                    labelNames.push(label.name);
                }
            }
        }

    }
    labelNames.sort();

    return labelNames;
}

function get_draft_snippit(info) {
    if (!info) {return null;}
    return info.subject + ' ' + info.date;
}

function get_draft_info(msg_id) {
    if (!msg_id) {return null;}
    // noinspection JSUnresolvedVariable
    var msg = Gmail.Users.Messages.get("me", msg_id, {format: "full"});
    var payload = msg.payload;
    var headers = payload.headers;
    var info = {};
    info.id = msg_id;
    //Date  Subject
    for (var j = 0; j < headers.length; j++) {
        var node = headers[j];

        if (node.name === 'Date') {
            info.date = node.value;
        }
        if (node.name === 'Subject') {
            info.subject = node.value;
        }
    }
    return info;
}

function get_email_body(msg_id) {
    if (!msg_id) {return null;}
    // noinspection JSUnresolvedVariable
    var msg = Gmail.Users.Messages.get("me", msg_id, {format: "full"});
    var payload = msg.payload;
    var body = payload.body;
    return Utilities.base64DecodeWebSafe(body.data);

}

function get_draft_info_from_thread(thread_id) {
    if (!thread_id) {return null;}
    // noinspection JSUnresolvedVariable
    var thread = Gmail.Users.Threads.get("me", thread_id, {format: "full"});
    // noinspection JSUnresolvedVariable
    var message = thread.messages[0]; //draft
    var headers = message.payload.headers;
    var info = {};
    info.id = message.id;
    info.thread_id = thread_id;
    //Date  Subject
    for (var j = 0; j < headers.length; j++) {
        var node = headers[j];

        if (node.name === 'Date') {
            info.date = node.value;
        }
        if (node.name === 'Subject') {
            info.subject = node.value;
        }
    }
    return info;
}

function getDraftArray() {
    var settings = getSettingsForUser();
    var label = settings.lable_to_use;
    if (!label) {
        return [];
    }

    var drafts = [];
    var pageToken = null;
    var msgArray = [];
    do {
        // noinspection JSUnresolvedVariable
        var msgList = Gmail.Users.Messages.list('me', {
            q: 'in:draft  label:' + label,
            pageToken: pageToken,
        });

        msgArray.push(msgList);
        // noinspection JSUnresolvedVariable
        pageToken = msgList.nextPageToken;
    } while (pageToken);

    for (var i = 0; i < msgArray.length; i++) {

        // noinspection JSUnresolvedVariable
        var da_messages = msgArray[i].messages;

        if (!da_messages) {
            continue;
        }

        for(var j = 0; j < da_messages.length; j++) {
            var nyet = da_messages[j];
            var msg_id = nyet.id;
            // noinspection JSUnresolvedVariable
            var thread_id = nyet.threadId;
            var info = get_draft_info(msg_id);
            info.thread_id = thread_id;
            drafts.push(info);


        }
    }

    function compare(a,b) {
        if (a.name < b.name)
            return -1;
        if (a.name > b.name)
            return 1;
        if (a.date < b.date)
            return -1;
        if (a.date > b.date)
            return 1;
        return 0;
    }

    drafts.sort(compare);
    return drafts;
}

function star_a_thread(thread_id) {

}

function label_a_thread(thread_id,labels) {

}



/**
 * go through and change out the selected keys, in each response, if they have whitespace in them
 * and trim older keys
 * @param {UserSettings} settings
 * @return {UserSettings}
 */
function trim_and_convert_settings(settings) {



    if ( (!settings.hasOwnProperty('responses') ) || (!Array.isArray(settings.responses))) {
        settings.responses = [];
    }

    var new_settings = _.cloneDeep(settings);
    for (var j = 0; j < new_settings.responses.length; j++) {
        new_settings.responses[j].senders_responded_to = {};
        new_settings.responses[j].threads_responded_to = {};
    }

    //console.log('new settings after stripping',JSON.stringify(new_settings));

    function test_if_space_or_punctuation(victim) {
        var format = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        return format.test(victim);
    }


    //make new response with altered senders_responded_to and threads_responded_to
    //new settings has same index order for responses
    for (var i = 0; i < settings.responses.length; i++) {
        /**
         * {ResponseSetting} response
         */
        var old_response = settings.responses[i];
        if (!old_response) {
            continue;
        } //null slot if deleted earlier

        var new_response = new_settings.responses[i];

        var now_ts = Math.round((new Date()).getTime() / 1000);

        if (old_response.hasOwnProperty('threads_responded_to') ) {
            //senders_responded_to remove older than three hours (do not copy over)
            //threads_responded_to remove older than three days (do not copy over)
            //else if one of these has a space in the string, or punctuation do an md5 hash for the key

            for (var t_prop in old_response.threads_responded_to) {
                if (!old_response.threads_responded_to.hasOwnProperty(t_prop)) {continue;}
                var lifetime_of_thread_in_seconds = THREAD_LIFE_IN_DAYS * 24 * 60 * 60;
                var ts_of_thread = old_response.threads_responded_to[t_prop];
                if (typeof ts_of_thread === 'string' || ts_of_thread instanceof String) {
                    ts_of_thread = parseInt(ts_of_thread);
                }
                var diff_of_thread = now_ts - ts_of_thread;
                if (diff_of_thread < lifetime_of_thread_in_seconds) {
                    //add it in
                    //check if t_prop has space or a punctuation
                    if (test_if_space_or_punctuation(t_prop)) {
                        console.log('converting property of ' + t_prop + ' to md5 hash ');
                        t_prop = MD5(t_prop, false); //if it is an old style key then change it
                    }

                    new_response.threads_responded_to[t_prop] = ts_of_thread;
                } else {
                    console.log('removing threads property of ' + t_prop + ' because with a time stamp of  ' + ts_of_thread + ' its too older than ' + THREAD_LIFE_IN_DAYS + ' days' );
                }
            } //end going through the threads_responded_to
        }

        if (old_response.hasOwnProperty('senders_responded_to') ) {
            for(var s_prop in old_response.senders_responded_to) {
                if (!old_response.senders_responded_to.hasOwnProperty(s_prop)) {continue;}
                var lifetime_of_sender_in_seconds = SENDERS_LIFE_IN_HOURS *60 *60;

                var ts_of_sender = old_response.senders_responded_to[s_prop];
                if (typeof ts_of_sender === 'string' || ts_of_sender instanceof String) {
                    ts_of_sender = parseInt(ts_of_sender);
                }
                var diff_of_sender = now_ts - ts_of_sender;
                if (diff_of_sender < lifetime_of_sender_in_seconds) {
                    //add it in
                    //check if s_prop has space or a punctuation
                    if (test_if_space_or_punctuation(s_prop)) {
                        console.log('converting property of ' + s_prop + ' to md5 hash ');
                        s_prop = MD5(s_prop,false); //if it is an old style key then change it
                    }
                    new_response.senders_responded_to[s_prop] = ts_of_sender;
                } else {
                    if (DEBUG) {
                        console.log('removing senders property of ' + s_prop + ' because with a time stamp of  ' + ts_of_thread + ' its older than ' + SENDERS_LIFE_IN_HOURS + ' hours ');

                    }
                }
            } //end going through the senders_responded_to
        }
    }
    if (B_DEBUG_SETTINGS) {
        console.log('new settings just before return', JSON.stringify(new_settings));
    }
    return new_settings;

}

/**
 *
 * @param {Object} test
 * @return number
 */
function get_byte_size_of_object(test) {


    /**
     * byteLength
     * @author https://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript/23329386#23329386
     */
    function byteLength(str) {
        // returns the byte length of an utf8 string
        var s = str.length;
        for (var i=str.length-1; i>=0; i--) {
            var code = str.charCodeAt(i);
            if (code > 0x7f && code <= 0x7ff) s++;
            else if (code > 0x7ff && code <= 0xffff) s+=2;
            if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
        }
        return s;
    }

    var test_string = JSON.stringify(test);
    var bytes_of_storage = byteLength(test_string);
    return bytes_of_storage;
}


