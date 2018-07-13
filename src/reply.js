function timer_hook_call() {
    var responses = get_replies_that_are_active();
    for(var k = 0; k < responses.length; k ++) {
        var response = responses[k];
        var start_ts = response.start_ts;
        filter_and_apply_response(start_ts,response);
    }
    //todo star and label after response
}

/**
 * gets any reply s that are working right now
 * @return array
 */
function get_replies_that_are_active() {

    var ret = [];
    //if plugin off then return
    var settings = getSettingsForUser();
    if (!settings.b_is_on) {
        if (DEBUG) {
            console.info("Settings are turned off, no email processed");
        }
        return ret;
    }
    //if vacation is on return empty

    var b_vacation_on = is_out_of_office_reply();
    if (b_vacation_on) {
        if (DEBUG) {
            console.info("Vacation is turned on, no email processed");
        }
        return ret;
    }


    var timezone = settings.timezone.id;
    var responses = settings.responses;

    if (responses ) {
        if (DEBUG) {
            console.info("going through responses",responses.length);
        }
        for(var i = 0; i < responses.length; i++) {
            /**
             * {ResponseSetting} response
             */
            var response = responses[i];
            if (!response) { continue;} //null slot if deleted earlier
            var b_is_today = is_response_on_today(response,timezone);
            if (!b_is_today) {
                if (DEBUG) {
                    console.info("Response is not today",response);
                }
                continue;
            } else {
                console.info("Response IS today",response);
            }
            //it is today, get the translated timestamps
            var start_ts = get_ts(response.startHour,response.startMinute,timezone);
            var end_ts = get_ts(response.endHour,response.endMinute,timezone);
            var ts = Math.round((new Date()).getTime() / 1000);

            //get the current ts of each reply using the user timezone, compare to now
            if (start_ts > ts) {
                if (DEBUG) {
                    console.info("not yet started, now is " + ts + " and start is  " + start_ts,response);
                }
                continue;
            }

            if (end_ts < ts) {
                if (DEBUG) {
                    console.info("already finished, now is " + ts + " and end is  " + end_ts,response);
                }
                continue;
            }

            if (DEBUG) {
                console.info("Send response to the filter",response);
            }

            response.start_ts = start_ts;
            //if got here then okay, lets filter and perhaps send
            ret.push(response);
        }
    }
    return ret;

}


/**
 *
 * @param {ResponseSetting} response
 * @param {string} timezone
 * @return {boolean}
 */
function is_response_on_today(response,timezone) {

    //find out what day it is for this timezone
    var m = moment().tz(timezone);
    var day_of_week = m.format('dddd');
    return response.day_of_week === day_of_week;
}

/**
 *
 * @param {int} hour
 * @param {int}minute
 * @param {string} timezone
 * @return {int}
 */
function get_ts(hour,minute,timezone) {
    return parseInt(moment().tz(timezone).hour(hour).minute(minute).second(0).unix() + '');
}

/**
 *
 * @param {int} start_at_ts
 * @param {ResponseSetting} response
 */
function filter_and_apply_response(start_at_ts,response) {

    if (!response.last_time_check_ts) {
        response.last_time_check_ts = 0;
    }
    var after_ts = null;
    if (response.last_time_check_ts < start_at_ts ) {
        after_ts = start_at_ts;
    }  else {
        after_ts = response.last_time_check_ts;
    }
    var ts = Math.round((new Date()).getTime() / 1000);

    response.last_time_check_ts = ts;
    var settings = getSettingsForUser();
    settings.responses[response.slot] = response;
    updateSettingsForUser(settings);
    var add_to_filter = "after: " + after_ts + " before: " + ts + " label:inbox is:unread ";
    var the_filter = response.filter;
    if (!the_filter) {
        the_filter = '';
    }
    the_filter = add_to_filter + '  ' + the_filter;
    if (DEBUG) {
        console.info('filter is  ' , the_filter);
        console.info('response doing the filtering is ' , response);
    }
    var what = getMailIDArray(the_filter);
    //get email ids and thread ids from filter results
    for(var k = 0; k < what.length; k++) {
        var out = what[k];
        var msg_id = out.id;
        var thread_id = out.threadId;
        mail_response(response,msg_id,thread_id);
        // add labels (if any set)
        set_labels(msg_id,response);

    }


}


function test() {
    var mens = get_replies_that_are_active();
    console.info("active replies are",mens);
//label:inbox from:willwoodlief@live.com after: 1531434161
//     var what = getMailIDArray('label:inbox from:willwoodlief@live.com after: 1531434161');
//     var msg_id = what[0].id;
//     var thread_id = what[0].threadId;
//     var settings = getSettingsForUser();
//     var response = settings.responses[0];
//     mail_response(response,msg_id,thread_id);
}

/**
 *
 * @param {ResponseSetting} response
 * @param {string} msg_id
 * @param {string} thread_id
 */
function mail_response(response,msg_id,thread_id){
    if (!response) {
        //response does not have a spreadsheet or a draft
        console.warn('response was null ' , response);
        return;
    }

    //get the body to send out
    var words = null;
    if (response.spreadsheet_entry) {
        var text = get_spreadsheet_value(response.spreadsheet_entry);
        words = {text:text,hmtl:null};
    }
    if (response.thread_id) {
         words = get_draft_body_from_thread(response.thread_id)
    }
    if (!words) {
        //response does not have a spreadsheet or a draft
        console.warn('response does not have a spreadsheet or a draft ' , response);
        return;
    }

    var headers = getHeaders(msg_id);
    if (DEBUG) {
        console.info('sending a reply of  to message ' + msg_id, words);
    }
    send_reply(thread_id,headers,words.text,words.html);
}


function get_draft_body_from_thread(thread_id) {

    function ascii_array_to_string(array) {
        var result = "";
        for (var i = 0; i < array.length; i++) {
            result += String.fromCharCode(parseInt(array[i]));
        }
        return result;
    }

    if (!thread_id) {return null;}
    // noinspection JSUnresolvedVariable
    var thread = Gmail.Users.Threads.get("me", thread_id, {format: "full"});

    // noinspection JSUnresolvedVariable
    var message = thread.messages[0]; //draft
    // Logger.log(JSON.stringify(message));
    var parts = message.payload.parts;
    var ret = {text:null,html:null};
    for(var j = 0; j < parts.length; j++) {
        var part = parts[j];
        if (part.mimeType === 'text/plain') {

            ret.text = ascii_array_to_string(part.body.data);
        }

        if (part.mimeType === 'text/html') {
            ret.html = ascii_array_to_string(part.body.data);
        }
    }
    return ret;
}

function send_reply(thread_id,headers,text,html) {

    var separator = "\n";
    var boundaryHL = 'cHJvZ3JhbW1lciB3aWxsd29vZGxpZWZAZ21haWwuY29t';
    var rows = [];
    rows.push('Subject: ' + headers['Subject']);
    rows.push('From: ' + Session.getActiveUser().getEmail());
    rows.push('To: ' + headers['From']);
    rows.push('In-Reply-To: ' + headers['From']);
    rows.push('References: ' + headers['Message-ID']);
    rows.push('Content-Type: multipart/alternative; boundary=' + boundaryHL + separator);

    if(text){
        rows.push('--' + boundaryHL);
        rows.push('Content-Type: text/plain; charset=UTF-8');
        rows.push('Content-Transfer-Encoding: quoted-printable' + separator);
        rows.push(quotedPrintable.encode(utf8.encode(text)));
    }

    if(html){
        rows.push('--' + boundaryHL);
        rows.push('Content-Type: text/html; charset=UTF-8');
        rows.push('Content-Transfer-Encoding: quoted-printable' + separator);
        rows.push(quotedPrintable.encode(utf8.encode(html)));
    }

    rows.push('--' + boundaryHL + '--');

    var da_text = rows.join(separator);
    var raw = Utilities.base64EncodeWebSafe(da_text);



    var message = Gmail.newMessage();
    message.threadId = thread_id;
    message.raw = raw;
    var sentMsg = Gmail.Users.Messages.send(message, "me");
    // {threadId=164909756ff83088, labelIds=[SENT], id=16490bd4a58e5fe3}
    return sentMsg;
}


function getHeaders(msg_id) {
    var msg = Gmail.Users.Messages.get("me", msg_id, {format: "full"});
    var payload = msg.payload;
    var headers = payload.headers;
    var info = {};
    //Date  Subject
    for (var j = 0; j < headers.length; j++) {
        var node = headers[j];
        info[node.name] = node.value

    }
    return info;

}

/**
 *
 * @param {string} query
 * @return {Array}
 */
function getMailIDArray(query) {


    var ret = [];
    var pageToken = null;
    var msgArray = [];
    do {
        // noinspection JSUnresolvedVariable
        var msgList = Gmail.Users.Messages.list('me', {
            q: query,
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
            ret.push(nyet)
        }
    }

    return ret;
}

/**
 *
 * @param {string} msg_id
 * @param {ResponseSetting} response
 */
function set_labels(msg_id,response) {
    if (response.labels || response.star_action ) {
        //check labels
        var label_ids_to_add = [];
        var these_labels = response.labels.split(/(\s+)/);
        var real_labels = getLabels();
        for(var k = 0; k < these_labels.length; k++) {
            var a_label = these_labels[k];
            if (real_labels.hasOwnProperty(a_label)) {
                var label_id = real_labels[a_label];
                label_ids_to_add.push(label_id);
            }
        }

        //if we star it, then add it here as a label
        if (response.star_action) {
            label_ids_to_add.push(real_labels['STARRED']);
        }

        //add the array of label ids to the thread
        if (label_ids_to_add.length > 0) {
            if (DEBUG) {
                console.info('adding labels to  msg_id' + msg_id  , label_ids_to_add);
            }
            var sentMsg = Gmail.Users.Messages.modify({
                'addLabelIds': label_ids_to_add,
                'removeLabelIds': []
            }, 'me', msg_id);
            return sentMsg;
        }
        return null;

    }

}


