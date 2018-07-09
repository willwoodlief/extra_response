/**
 * Creates an action that routes through the `dispatchAction` entry point.
 *
 * @param {string} name - Action handler name
 * @param {Object} opt_params - Additional parameters to pass through
 * @return {GoogleAppsScript.Card.Action}
 * @private
 */
function createAction_(name, opt_params) {
    var params = _.extend({}, opt_params);
    params.action = name;
    return CardService.newAction()
        .setFunctionName("dispatchAction")
        .setParameters(params);
}


/**
 * Builds a card that displays the search options for scheduling a meeting.
 * @param {Event} e
 * @param {Object} opts Parameters for building the card
 * @param {(string|null)} opts.day_of_week - One of [Monday..Sunday]
 * @param {(number|null)} opts.startHour - start hour (0-23)
 * @param {(number|null)} opts.startMinute - start minute (0-59)
 * @param {(number|null)} opts.endHour - end hour (0-23)
 * @param {null|number} opts.endMinute - end minute (0-59)
 * @param {(string|null)} opts.state - State to pass on to subsequent actions
 * @return {GoogleAppsScript.Card.Card}
 */
function buildEditResponseCard(e, opts) {

    if (!opts.state) {
        opts.state = '';
    }
    var preferenceSection = CardService.newCardSection()
        .setHeader("Edit Response")

        .addWidget(
            CardService.newTextInput()
                .setFieldName("response_name")
                .setTitle("Response Name")
                .setHint("Any name will do")
        )

        .addWidget(
            createDaysSelectDropdown_("Day of Week", "day_of_week", opts.day_of_week)
        )

        .addWidget(
            createHoursSelectDropdown_("Start Hour", "start_hour", opts.startHour)
        )

        .addWidget(
            createMinutesSelectDropdown_("Start Minutes", "start_minute", opts.startMinute)
        )

        .addWidget(
            createHoursSelectDropdown_("End Hour", "end_hour", opts.endHour)
        )

        .addWidget(
            createMinutesSelectDropdown_("End Minutes", "end_minute", opts.endMinute)
        )

        // .addWidget(
        //     createDraftSelectDropdown_(e, "Draft to Use", "draft_id", opts.endMinute)
        // )

        .addWidget(
            CardService.newButtonSet().addButton(
                CardService.newTextButton()
                    .setText("Save Response")
                    .setOnClickAction(
                        createAction_("saveResponse", {state: ''})
                    )
            )
        );

    testMessageList();
    return CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle("Save Response"))
        .addSection(preferenceSection)
        .build();
}


function testMessageList() {
    var pageToken = null;
    var msgArray = [];
    do {
        var msgList = Gmail.Users.Messages.list('me', {
            q: 'in:draft  label:extra-response',
            pageToken: pageToken,
        });

        msgArray.push(msgList);
        pageToken = msgList.nextPageToken;
    } while (pageToken);

    console.info(msgArray);
    for (var i = 0; i < msgArray.length; i++) {

        console.info(msgArray[i].messages[0]);
        var msg_id = msgArray[i].messages[0].id;

        console.info('Message ID : %s', msg_id);
        var msg = Gmail.Users.Messages.get("me", msg_id, {format: "full"});
        console.info(msg);
        var payload = msg.payload;
        var headers = payload.headers;
        console.info(headers);
        //Date  Subject
        for (var j = 0; j < headers.length; j++) {
            var node = headers[j];
            if (node.name === 'Date') {
                console.info("Date is " + node.value);
            }
            if (node.name === 'Subject') {
                console.info("Subject is " + node.value);
            }
        }

    }

}

/**
 * Creates a drop down for selecting a draft
 * @param {Event} e
 * @param {string} label - Top label of widget
 * @param {string} name - Key used in form submits
 * @param {number} defaultValue - Default draft id
 * @return {GoogleAppsScript.Card.SelectionInput}
 * @private
 */
function createDraftSelectDropdown_(e, label, name, defaultValue) {

    // var accessToken = e.messageMetadata.accessToken;
    // var messageId = e.messageMetadata.messageId;
    // GmailApp.setCurrentMessageAccessToken(accessToken);
    // var mailMessage = GmailApp.getMessageById(messageId);
    // var subject = mailMessage.getSubject();
    // var date = mailMessage.getDate().toString();
    // var text = subject + " - " + date;
    // console.info('top test text is  ', text);

    var widget = CardService.newSelectionInput()
        .setTitle(label)
        .setFieldName(name)
        .setType(CardService.SelectionInputType.DROPDOWN);

    var accessToken = e.messageMetadata.accessToken;
    if (DEBUG) {
        console.info('Current access token is  ', accessToken);
        console.info('Event in create drafts is  ', e);
    }
    GmailApp.setCurrentMessageAccessToken(accessToken);
    testMessageList();

    // //var threads = GmailApp.search('in:draft label:extra-response');
    // var threads = GmailApp.search('label:test-label');
    // console.info('got ' + threads.length + " test-label threads");
    // for (var i = 0; i < threads.length; i++) {
    //     var msgId = threads[0].getMessages()[0].getId();
    //     console.info('labeled msg test-label id is  ', msgId);
    //     var msg = threads[0].getMessages()[0];
    //     var subject = msg.getSubject();
    //     var date = msg.getDate().toString();
    //     var text = subject + " - " + date;
    //     console.info('test text is  ', text);
    // }


    // var drafts = GmailApp.getDrafts();
    // if (DEBUG) {
    //     console.info('there are ' + drafts.length + 'drafts');
    // }
    // var draft = GmailApp.getDrafts()[0]; // The first draft message in the drafts folder
    // var message = draft.getMessage();
    // console.info('got subject',message.getSubject());
    // for (var i = 0; i < drafts.length; i++) {
    //     var draft = drafts[i];
    //     var key = draft.getId();
    //     if (DEBUG) {
    //         console.info('the id of this draft is   ' , key);
    //         console.info('the draft is   ' , draft);
    //     }
    //     var msg = draft.getMessage();
    //     var subject = msg.getSubject();
    //     var date = msg.getDate().toString();
    //     var text = subject + " - " + date;
    //     widget.addItem(text, key, key === defaultValue);
    // }

    return widget;
}

/**
 * Creates a drop down for selecting a day of the week.
 *
 * @param {string} label - Top label of widget
 * @param {string} name - Key used in form submits
 * @param {string} defaultValue - Default day of week (Monday..Sunday)
 * @return {GoogleAppsScript.Card.SelectionInput}
 * @private
 */
function createDaysSelectDropdown_(label, name, defaultValue) {
    var widget = CardService.newSelectionInput()
        .setTitle(label)
        .setFieldName(name)
        .setType(CardService.SelectionInputType.DROPDOWN);
    var days = ['Monday', "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    for (var i = 0; i < days.length; ++i) {
        var text = days[i];
        widget.addItem(text, text, text === defaultValue);
    }
    return widget;
}

/**
 * Creates a drop down for selecting a time of day (hours only).
 *
 * @param {string} label - Top label of widget
 * @param {string} name - Key used in form submits
 * @param {number} defaultValue - Default duration to select (0-23)
 * @return {GoogleAppsScript.Card.SelectionInput}
 * @private
 */
function createHoursSelectDropdown_(label, name, defaultValue) {
    var widget = CardService.newSelectionInput()
        .setTitle(label)
        .setFieldName(name)
        .setType(CardService.SelectionInputType.DROPDOWN);
    for (var i = 0; i < 24; ++i) {
        var text = moment()
            .hour(i)
            .minutes(0)
            .format("hh a");
        widget.addItem(text, i, i === defaultValue);
    }
    return widget;
}


/**
 * Creates a drop down for selecting minutes of the hour.
 *
 * @param {string} label - Top label of widget
 * @param {string} name - Key used in form submits
 * @param {number} defaultValue - Default duration to select (0-23)
 * @return {GoogleAppsScript.Card.SelectionInput}
 * @private
 */
function createMinutesSelectDropdown_(label, name, defaultValue) {
    var widget = CardService.newSelectionInput()
        .setTitle(label)
        .setFieldName(name)
        .setType(CardService.SelectionInputType.DROPDOWN);
    for (var i = 0; i < 12; ++i) {
        var actual_minutes = i * 5;
        var text = moment()
            .minutes(actual_minutes)
            .format("mm");
        widget.addItem(text, actual_minutes, defaultValue === actual_minutes);
    }
    return widget;
}


/**
 * @param {Event} e
 * @return {GoogleAppsScript.Card.Card}
 */
function createTimezoneTestCard(e) {


    var card = CardService.newCardBuilder().setName("Test timeZone");

    card.setHeader(CardService.newCardHeader().setTitle("test"));

    var section = CardService.newCardSection();

    section.addWidget(CardService.newTextParagraph().setText(e.userLocale));
    section.addWidget(CardService.newTextParagraph().setText(e.userTimezone.offSet));
    section.addWidget(CardService.newTextParagraph().setText(e.userTimezone.id)); //this is the timezone string
    section.addWidget(CardService.newTextParagraph().setText('script zone is ' + Session.getScriptTimeZone()));

    card.addSection(section);


    return card.build();
}


/**
 * Builds a card that displays details of an error.
 *
 * @param {Object} opts Parameters for building the card
 * @param {Error} opts.exception - Exception that caused the error
 * @param {string|undefined} opts.errorText - Error message to show
 * @param {boolean} opts.showStackTrace - True if full stack trace should be displayed
 * @return {GoogleAppsScript.Card.Card}
 */
function buildErrorCard(opts) {
    var errorText = opts.errorText;

    if (opts.exception && !errorText) {
        errorText = opts.exception.toString();
    }

    if (!errorText) {
        errorText = "No additional information is available.";
    }

    var card = CardService.newCardBuilder();
    card.setHeader(
        CardService.newCardHeader().setTitle("An unexpected error occurred")
    );
    card.addSection(
        CardService.newCardSection().addWidget(
            CardService.newTextParagraph().setText(errorText)
        )
    );

    if (opts.showStackTrace && opts.exception && opts.exception.stack) {
        var stack = opts.exception.stack.replace(/\n/g, "<br/>");
        card.addSection(
            CardService.newCardSection()
                .setHeader("Stack trace")
                .addWidget(CardService.newTextParagraph().setText(stack))
        );
    }

    return card.build();
}


/**
 * Create and return a built 'About' informational card.
 * @return {GoogleAppsScript.Card.Card}
 */
function createAboutCard() {


    var card = CardService.newCardBuilder();

    card.setHeader(CardService.newCardHeader().setTitle('About'));

    card.addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph()
                .setText('This add-on allows multiple responses to be be set for each day, and is only on when vacation mode is off '))
        // ... add other information widgets or sections here ...
    );

    card.addSection(CardService.newCardSection()
        .addWidget(CardService.newButtonSet().addButton(
            CardService.newTextButton()
                .setText("New Response")
                .setOnClickAction(
                    createAction_("newResponse", {state: ''})
                )
            )
        )
    );

    return card.build();  // Don't forget to build the card!
}


/**
 * @param {Event} e
 * @return {GoogleAppsScript.Card.Card}
 */
function buildMainCard(e) {

    // have a link to create a new response
    // list an edit button for each saved response, organized by day of week


    var card = CardService.newCardBuilder();

    card.setHeader(CardService.newCardHeader().setTitle('About'));

    card.addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph()
                .setText('This add-on allows multiple responses to be be set for each day, and is only on when vacation mode is off '))
        // ... add other information widgets or sections here ...
    );

    card.addSection(CardService.newCardSection()


        .addWidget(CardService.newButtonSet().addButton(
            CardService.newTextButton()
                .setText("New Response")
                .setOnClickAction(
                    createAction_("newResponse", {state: ''})
                )
            )
        )
    );


    card.addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph()
                .setText('This is where the responses will be listed '))
        // ... add other information widgets or sections here ...
    );

    return card.build();  // Don't forget to build the card!

}

/**
 * Create and return a built settings card.
 * @return {GoogleAppsScript.Card.Card}
 */
function createMainSettingCard() {


    return CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('Settings'))
        .addSection(CardService.newCardSection()
            .addWidget(CardService.newSelectionInput()
                .setType(CardService.SelectionInputType.CHECK_BOX)
                .setTitle("Turn on Responses?")
                .setFieldName("settings_binary")
                .addItem("If Checked, then this will do responses", "is_on", false)
                .setOnChangeAction(CardService.newAction()
                    .setFunctionName("handleCheckboxChange")
                )
            )
        ).build();   // Don't forget to build the card!
}


function handleCheckboxChange(e) {
    var settings = getSettingsForUser();
    var b_on = e.formInput.settings_binary;
    if (DEBUG) {
        console.info(' b on raw ', b_on);
    }
}