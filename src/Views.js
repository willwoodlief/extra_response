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
 * @param {ResponseSetting} opts Response Setting
 * @param {string} [error_response=null]  any optional message
 * @return {GoogleAppsScript.Card.Card}
 */
function buildEditResponseCard(e, opts,error_response) {


    var settings = getSettingsForUser();

    if (!opts || (Object.getOwnPropertyNames(opts).length === 0)) {
        opts = {};
    }

    if (! opts.hasOwnProperty('thread_id')) {
        opts.thread_id = null;
    }

    if (! opts.hasOwnProperty('draft_snippit')) {
        opts.draft_snippit = '';
    }
    var what_drafts =  createDraftSelectDropdown_( "Draft to Use", "thread_id", opts.thread_id,opts.draft_snippit);

    if (!what_drafts) {
        //there is nothing to display in the box
        if (settings.lable_to_use) {
            what_drafts = CardService.newTextParagraph()
                .setText('There were no drafts with the label of  ' + settings.lable_to_use);
        } else {
            what_drafts = CardService.newTextParagraph()
                .setText('To enable selecting a draft as a template, please go to settings and select a label to use ');
        }
    }


    var top_header = CardService.newTextParagraph();
    if (error_response) {
        top_header.setText('<font color="#ff0000">Could not create the response, there was an issue<br><b>* ' + error_response + '</font></b>');
    }



    var preferenceSection = CardService.newCardSection()
        .setHeader("Edit Response")
        .addWidget(top_header)
        .addWidget(
            CardService.newTextInput()
                .setFieldName("response_name")
                .setTitle("Response Name")
                .setHint("Any name will do")
                .setValue(opts.response_name)
        )

        .addWidget(
            CardService.newTextInput()
                .setFieldName("filter")
                .setTitle("Email Filter For Response (optional)")
                .setHint("Gmail filter")
                .setValue(opts.filter ? opts.filter.toString(): '')
        )

        .addWidget(
            CardService.newTextInput()
                .setFieldName("forward")
                .setTitle("Forward Email to another address")
                .setHint("Other Email Address")
                .setValue(opts.forward ? opts.forward.toString(): '')
        )

        .addWidget(
            CardService.newTextInput()
                .setFieldName("labels")
                .setTitle("Labels to apply - seperated by a space")
                .setHint("")
                .setValue(opts.labels ? opts.labels.toString(): '')
        )

        .addWidget(CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.CHECK_BOX)
            .setTitle("Star Message")
            .setFieldName("star_action")
            .addItem("Star the incoming message ", "star_action", opts.star_action)
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

        .addWidget(
            CardService.newTextParagraph()
                .setText('For a response, you should pick either  <br> a draft <br>(filtered by the label set in settings) <br> or a spreadsheet row <br>( spreadsheet link in settings)')
        )




         .addWidget(
             what_drafts
         )

        .addWidget(
            createSpreadsheetSelectDropdown_("Spreadsheet Response", "spreadsheet_entry", opts.spreadsheet_entry)
        )

        .addWidget(
            CardService.newButtonSet().addButton(
                CardService.newTextButton()
                    .setText("Save Response")
                    .setOnClickAction(
                        createAction_("saveResponse", {state: opts.slot.toString()})
                    )
            )
                .addButton(
                    CardService.newTextButton()
                        .setText("Cancel")
                        .setOnClickAction(
                            createAction_("showMain", {state: ''})
                        )
                )
        )

        .addWidget(
            CardService.newButtonSet().addButton(
                CardService.newTextButton()
                    .setText('<font color="#ff0000">Delete Response</font>')
                    .setOnClickAction(
                        createAction_("deleteResponse", {state: opts.slot.toString()})
                    )
            )
        );


    return CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle("Response"))
        .addSection(preferenceSection)
        .build();
}


/**
 * Creates a drop down for selecting a draft
 * @param {string} label - Top label of widget
 * @param {string} name - Key used in form submits
 * @param {string} defaultValue - Default draft id
 * @return {GoogleAppsScript.Card.SelectionInput}
 * @private
 */
function createLabelSelectDropdown_( label, name, defaultValue) {

    var labels = getLabelList();
    var widget = CardService.newSelectionInput()
        .setTitle(label)
        .setFieldName(name)
        .setType(CardService.SelectionInputType.DROPDOWN);
    for (var i = 0; i < labels.length; i ++) {
        widget.addItem(labels[i], labels[i], labels[i] === defaultValue);
    }

    return widget;
}


/**
 * Creates a drop down for selecting an entry in the spreadsheet
 * @param {string} label - Top label of widget
 * @param {string} name - Key used in form submits
 * @param {string} defaultValue - Default draft id
 * @return {GoogleAppsScript.Card.SelectionInput}
 * @private
 */
function createSpreadsheetSelectDropdown_( label, name, defaultValue) {

    var sheet_data = get_spreadsheet_data().data;
    var widget = CardService.newSelectionInput()
        .setTitle(label)
        .setFieldName(name)
        .setType(CardService.SelectionInputType.DROPDOWN);
    widget.addItem('(none)', '', defaultValue === null);

    if (defaultValue) {
        widget.addItem(defaultValue, defaultValue, defaultValue === defaultValue);
    }
    for (var i = 0; i < sheet_data.length; i ++) {
        var row = sheet_data[i];
        var text = row[0];
        if (!text) {continue;}
        widget.addItem(text, text, text === defaultValue);
    }

    return widget;
}



/**
 * Creates a drop down for selecting a draft
 * @param {string} label - Top label of widget
 * @param {string} name - Key used in form submits
 * @param {string} defaultValue - Default draft id
 * @param {string} default_name - the name of the default, in case it is not in the list
 * @return {GoogleAppsScript.Card.SelectionInput|null}
 * @private
 */
function createDraftSelectDropdown_( label, name, defaultValue,default_name) {
    var drafts = getDraftArray();
    console.info ("drafts array is ",drafts );
    if (! (drafts.length > 0 || defaultValue) ) {
        return null;
    }
    var widget = CardService.newSelectionInput()
        .setTitle(label)
        .setFieldName(name)
        .setType(CardService.SelectionInputType.DROPDOWN);

    widget.addItem('(none)', '', defaultValue === null);

    if (defaultValue) {
        widget.addItem(default_name, defaultValue, defaultValue === defaultValue);
    }
    for (var i = 0; i < drafts.length; ++i) {
        var draft = drafts[i];
        var text = get_draft_snippit(draft);
        widget.addItem(text, draft.thread_id, draft.thread_id === defaultValue);
    }



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
                .setText('This add-on (version '+CURRENT_VERSION+' Last Changed on '+ LAST_CHANGED_ON +' ) allows multiple responses to be be set for each day, and is only on when vacation mode is off '))
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

    var settings = getSettingsForUser();
    var card = CardService.newCardBuilder();

    card.setHeader(CardService.newCardHeader().setTitle('About Fexi Autoresponder'));

    //test to see if settings is too big
    var bytes_of_storage = get_byte_size_of_object(settings);
    var extra_size_message = '';
    var normal_size_message = '';
    if (bytes_of_storage > MAX_ALLOWED_SETTING_SIZE) {
        extra_size_message = ' Responders will not be turned on because the user settings size of ' + bytes_of_storage + ' is greater than '+ MAX_ALLOWED_SETTING_SIZE +  " . Allow the remembered history to be removed, over the hours, as it ages out. If you do not want to wait, you can  remove a heavily used response and create it again" ;
    } else {
      //  var percent_used = Math.round(bytes_of_storage/MAX_ALLOWED_SETTING_SIZE * 100); //todo change back to this after limits are known
        var percent_used = Math.round(bytes_of_storage/9000 * 100);
        normal_size_message = "Stored Memory is "+ percent_used +"% Filled ";
    }

    card.addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph()
                .setText('This add-on allows multiple responses to be be set for each day, and is only on when vacation mode is off. '
                    + " Version "+CURRENT_VERSION+" Last changed on " + LAST_CHANGED_ON))
        // ... add other information widgets or sections here ...
    );

    if (extra_size_message) {
        card.addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(extra_size_message)));
    }

    if (normal_size_message) {
        card.addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(normal_size_message)));
    }



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


    var edit_section = CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
            .setText('Click an already made response to edit. Or Create new responses '));



    var responses = settings.responses;

    var has_responses = false;
    if (responses.length > 0) {
        for (var g = 0; g < responses.length; g++) {
            var tr = responses[g];
            if (!tr) {
                continue;
            } //if its deleted
            has_responses = true;
        }
    }

    if (has_responses) {
        var edit_button_set = CardService.newButtonSet();
        for (var i = 0; i < responses.length; i++) {
            var r = responses[i];
            if (!r) {continue;} //if its deleted
            edit_button_set.addButton(
                CardService.newTextButton()
                    .setText(r.response_name)
                    .setOnClickAction(
                        createAction_("editResponse", {state: i.toString()})
                    )
            );

        }
        edit_section.addWidget(edit_button_set);
    }



    card.addSection(
        edit_section
    );

    return card.build();  // Don't forget to build the card!

}

/**
 * Create and return a built settings card.
 * @return {GoogleAppsScript.Card.Card}
 */
function createMainSettingCard() {


    var settings = getSettingsForUser();
  
//      return CardService.newCardBuilder()
//        .setHeader(CardService.newCardHeader().setTitle('Settings'))
//        .addSection(CardService.newCardSection() 
//        ).build(); 

    var labels = getLabelList();
    var label_widget = CardService.newSelectionInput()
        .setTitle("Label to Use When Selecting Drafts")
        .setFieldName("lable_to_use")
        .setType(CardService.SelectionInputType.DROPDOWN);
    label_widget.addItem("(none)", null, null === settings.lable_to_use);
    for (var i = 0; i < labels.length; ++i) {
        label_widget.addItem(labels[i], labels[i], labels[i] === settings.lable_to_use);
    }

    label_widget.setOnChangeAction(CardService.newAction()
        .setFunctionName("handleSettingsLabelChange")
    );

    var sheet_text = CardService.newTextParagraph()
        .setText('<br>Responses can be either drafts, or items in a spreadsheet. A sheet is created automatically for this plugin. Click below to open it ');
    var sheet_link_widget = CardService.newButtonSet().addButton(
        CardService.newTextButton()
            .setText("Open Spreadsheet")
            .setOnClickAction(
                createAction_("openSpreadsheet", {state: ''})
            )
        );


    return CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('Settings'))
        .addSection(CardService.newCardSection()
            .addWidget(CardService.newSelectionInput()
                .setType(CardService.SelectionInputType.CHECK_BOX)
                .setTitle("Turn on Responses?")
                .setFieldName("settings_binary")
                .addItem("If Checked, then this will do responses", "is_on", settings.b_is_on)
                .setOnChangeAction(CardService.newAction()
                    .setFunctionName("handlePluginOnCheckboxChange")
                )
            )
            .addWidget(label_widget)
            .addWidget(sheet_text)
            .addWidget(sheet_link_widget)

        ).build();   // Don't forget to build the card!
}

