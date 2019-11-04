function timer_hook_call() {
    var responses = get_replies_that_are_active();
    for(var k = 0; k < responses.length; k ++) {
        var response = responses[k];
        var start_ts = response.start_ts;
        filter_and_apply_response(start_ts,response);
    }
    if (DEBUG) {
      console.info("Finished processing. No of active responses : " + responses.length.toString());
    }

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


    var timezone = null;
    if (settings.timezone) {
        timezone = settings.timezone.id;
    }

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
            if (!timezone) {
                if (response.timezone) {
                    timezone = response.timezone;
                }

            }
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
  
    var after_ts = start_at_ts;

//    var after_ts = null;
//    if (response.last_time_check_ts < start_at_ts ) {
//        after_ts = start_at_ts;
//    }  else {
//        after_ts = response.last_time_check_ts;
//    }
  
    if (DEBUG) {
        console.info('last_time_check_ts is  ' , response.last_time_check_ts);
        console.info('start_at_ts is  ' , start_at_ts);
    }
  
    var ts = Math.round((new Date()).getTime() / 1000);

    response.last_time_check_ts = ts;
    var settings = getSettingsForUser();

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
        var b_forward_only = false;
        var headers = getHeaders(msg_id);
        var thread_hash = headers['From'] + ' ' + headers['Subject'];

        //@version 1.3 do not reply if  noreply,no-reply is anywhere in the from headers
        var test_from = headers['From'];
        if (!(typeof test_from === 'string' || test_from instanceof String) ) {
            if (Array.isArray(test_from)) {
                test_from = test_from.join(',');
            } else  {
                test_from += '';
            }
        }

        function test_no_response(s) {
            var arr = [
                'noreply',
                'no-reply',
                'do-not-reply',
                'dontreply'
            ];

            for(var i = 0; i < arr.length; i++) {
                var test = arr[i];
                if (s.indexOf(test) !== -1) {
                    return true;
                }
            }
            return false;
        }

        var is_no_response = test_no_response(test_from);
        if ( is_no_response) {
            b_forward_only = true;
            if (DEBUG) {
                console.info("FROM address has a no response, will not reply ", test_from);
            }
        } else {

            // only respond automatically per one thread id
            if (!response.hasOwnProperty('threads_responded_to')) {
                response.threads_responded_to = {};
                if (DEBUG) {
                    console.info("never seen any threads in this response, so this is first email processed for it. Ok to send ");
                }
            } else {
                //check to see if the thread id is a key in the hash
                if (response.threads_responded_to.hasOwnProperty(thread_hash)) {
                    b_forward_only = true; //do not process if already replied
                    if (DEBUG) {
                        console.info("already sent a message for this thread because of ", response.threads_responded_to, thread_hash);
                    }
                } else {
                    if (DEBUG) {
                        console.info("Did not find a thread from earlier in the hash ", response.threads_responded_to, thread_hash);
                    }
                }
            }

            if (!response.hasOwnProperty('senders_responded_to')) {
                response.senders_responded_to = {};
                response.senders_responded_to[test_from] = ts;
                if (DEBUG) {
                    console.info("No senders ever registered for this response,  allowing email to be sent ",response.senders_responded_to);
                }
            } else {

                if (response.senders_responded_to.hasOwnProperty(test_from)) {
                    var last_send_ts = response.senders_responded_to[test_from];
                    if (typeof last_send_ts === 'string' || last_send_ts instanceof String) {
                        last_send_ts = parseInt(last_send_ts);
                    }
                    if (!Date.now) {
                        Date.now = function() { return new Date().getTime(); }
                    }
                    var now_ts = Math.floor(Date.now() / 1000);
                    var diff = now_ts - last_send_ts;

                    if ( diff < 3600 ) {
                        if (DEBUG) {
                            console.info("Cannot send a response. We last replied to this sender at  " + last_send_ts + " which is less than an hour using the current timestamp of " + now_ts + " difference in seconds is " + diff ,response.senders_responded_to);
                        }
                        b_forward_only = true; //do not process if already replied to in the last hour
                    } else {
                        if (DEBUG) {
                            console.info("Sending okay so far. We last replied to this sender at  " + last_send_ts + " which is MORE than an hour using the current timestamp of " + now_ts + " difference in seconds is " + diff ,response.senders_responded_to);
                        }
                        response.senders_responded_to[test_from] = ts;
                    }
                } else {
                    response.senders_responded_to[test_from] = ts;
                    if (DEBUG) {
                        console.info("Sender does not have an entry yet in the senders_responded_to hash, will add it now   "
                            ,response.senders_responded_to);
                    }
                }

            }
        }
        mail_response(response,msg_id,thread_id,headers,b_forward_only);
        // add labels (if any set)
        set_labels(msg_id,response);
        response.threads_responded_to[thread_hash] = ts;
    }
  
    if (DEBUG) {
        console.info('slot is ',response.slot);
        console.info('response before update is ',settings.responses[response.slot]);

    }

    settings.responses[response.slot] = response;
    updateSettingsForUser(settings);
    if (DEBUG) {
        console.info('response value is ',response);
        console.info('response after update is ',settings.responses[response.slot]);
        console.info('last_time_check_ts is  ' , response.last_time_check_ts);
        console.info('settings is  ' , settings);
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
 * @param {Object} headers
 * @param {boolean} b_forward_only
 */
function mail_response(response,msg_id,thread_id,headers,b_forward_only){
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



    if (!b_forward_only) {
        if (DEBUG) {
            console.info('getting ready to send a reply to message: ' + msg_id, words);
        }
        send_reply(null,thread_id,headers,words.text,words.html);
    } else {
        if (DEBUG) {
            console.info('not sending a reply to the message because already sent on thread ' + msg_id);
        }
        words = {text:"Did not respond, already auto replied earlier",hmtl:"Did not respond, already auto replied earlier"};
    }


    if (response.forward) {
        //add in earlier message text and html mail body
        if (DEBUG) {
            console.info('sending a forward of  message ' + msg_id, words);
        }
        forward_message(response.forward,msg_id,headers);
    }
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

/**
 *
 * @param {string} msg_id
 * @return array of {mime,decoded}
 */
function get_email_parts(msg_id) {
    function ascii_array_to_string(array) {
        var result = "";
        for (var i = 0; i < array.length; i++) {
            result += String.fromCharCode(parseInt(array[i]));
        }
        return result;
    }

    if (!msg_id) {return null;}
    // noinspection JSUnresolvedVariable
    var msg = Gmail.Users.Messages.get("me", msg_id, {format: "full"});
    var payload = msg.payload;
    var headers = payload.headers;
    if(DEBUG) {
        console.info("api payload stuff for message " + msg_id,payload);
    }
    var parts = payload.parts;
    //Logger.log('headers');
    //  Logger.log(headers);
    //Logger.log('parts');
    // Logger.log(parts);
    var ret = [];
    while (parts.length) {
        var part = parts.shift();
        if (part.parts) {
            parts = parts.concat(part.parts);
        }
        if (part.body.data) {
            // Logger.log('part');
            // Logger.log(part);
            ret.push( {'mime' : part.mimeType, 'decoded' : ascii_array_to_string(part.body.data) } );
        }


    }
    if (ret.length === 0 ) {
        var body_data = payload.body.data;
        var body_mime = payload.mimeType;
        ret.push( {'mime' : body_mime, 'decoded' : ascii_array_to_string(body_data) } );
    }
    return ret;
}

/**
 *
 * @param {string} email_to
 * @param {string} msg_id
 * @param headers
 * @return {GoogleAppsScript.Gmail.GmailMessage | * | void}
 */
function forward_message(email_to,msg_id,headers) {

    var separator = "\n";
    var boundaryHL = 'cHJvZ3JhbW1lciB3aWxsd29vZGxpZWZAZ21haWwuY29t';
    var rows = [];
    var email_from = headers['Delivered-To']
    rows.push('Subject: ' + headers['Subject']);
    if(email_from)
    {
      rows.push('From: ' + email_from);
    }
    else{
      rows.push('From: ' + Session.getActiveUser().getEmail());   
      //      rows.push('From: ' + Session.geteffectiveUser().getEmail());     

    }
    if (email_to) {
        rows.push('To: ' + email_to);
    } else {
        rows.push('To: ' + headers['From']);
    }

    rows.push('In-Reply-To: ' + headers['From']);
    rows.push('References: ' + headers['Message-ID']);
    rows.push('Content-Type: multipart/alternative; boundary=' + boundaryHL + separator);
    var parts = get_email_parts(msg_id);
    if (DEBUG) {
        console.info('forwarded headers: ',headers);
        console.info('parts of  ' + msg_id, parts);
    }
    for(var p in parts) {
        var part = parts[p];
        var content_type = part.mime;
        var content_data = part.decoded;
        rows.push('--' + boundaryHL);
        rows.push('Content-Type: '+content_type+'; charset=UTF-8');
        rows.push('Content-Transfer-Encoding: quoted-printable' + separator);
        rows.push(quotedPrintable.encode(utf8.encode(content_data)));
    }

    rows.push('--' + boundaryHL + '--');

    var da_text = rows.join(separator);
    var raw = Utilities.base64EncodeWebSafe(da_text);



    var message = Gmail.newMessage();
    message.raw = raw;
    var sentMsg = Gmail.Users.Messages.send(message, "me");
    // {threadId=164909756ff83088, labelIds=[SENT], id=16490bd4a58e5fe3}
    return sentMsg;
}

function send_reply(email_to,thread_id,headers,text,html) {

  
    if (DEBUG) {
      console.info('reply headers is : ',headers);
      console.info('email_to is : ',email_to);

    }
  
    var separator = "\n";
    var boundaryHL = 'cHJvZ3JhbW1lciB3aWxsd29vZGxpZWZAZ21haWwuY29t';
    var rows = [];
    var email_from = headers['Delivered-To']
    
    rows.push('Subject: ' + headers['Subject']);
    if(email_from)
    {
      rows.push('From: ' + email_from);
    }
    else{
      rows.push('From: ' + Session.getActiveUser().getEmail());   
      //      rows.push('From: ' + Session.geteffectiveUser().getEmail());     

    }
    if (email_to) {
        rows.push('To: ' + email_to);
    } else {
        rows.push('To: ' + headers['From']);
    }
    if (DEBUG) {
        console.info('email from is ',headers['From']);
    }

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
            if (!a_label.trim()) {continue;}
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