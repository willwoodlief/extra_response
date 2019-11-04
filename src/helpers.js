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


