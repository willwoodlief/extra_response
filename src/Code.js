/**
 * Typedef for events passed from Gmail to the add-on. Supplied for
 * reference.
 *
 * @typedef {Object} Event
 * @property {Object} formInput - optional array which has key values from a form
 * @property {Object} parameters - Request parameters. Must include a
 *    key "action" with the name of the action to dispatch
 * @property {string} userLocale
 * @property {Object} messageMetadata
 * @property {string} messageMetadata.accessToken
 * @property {Object} userTimezone
 * @property {string} userTimezone.offSet
 * @property {string} userTimezone.id
 */


/**
 * Typedef for error handler callbacks. Provided for reference.
 *
 * @callback ErrorHandler
 * @param {Error} exception - Exception to handle
 * @Return {GoogleAppsScript.Card.Card|GoogleAppsScript.Card.ActionResponse|GoogleAppsScript.Card.UniversalActionResponse} optional card or action response to render
 */

var DEBUG = true;  // flag for adding in debugging code


/**
 * Entry point for the add-on. Handles an user event and
 * invokes the corresponding action
 *
 * @param {Event} event - user event to process
 * @return {GoogleAppsScript.Card.UniversalActionResponse}
 */
function handleExtraResponses(event) {
    if (event.parameters === undefined) {
        event.parameters = {};
    }
    if (event.parameters.action === undefined) {
        event.parameters.action = "showMain";
    }

    return dispatchActionInternal(event, universalActionErrorHandler);
}


/**
 * Entry point for secondary actions. Handles an user event and
 * invokes the corresponding action
 *
 * @param {Event} event - user event to process
 * @return {GoogleAppsScript.Card.ActionResponse} Card or form action
 */
function dispatchAction(event) {
    return dispatchActionInternal(event, actionErrorHandler);
}


/**
 * Entry point for the add-on with the universalActions. In this case there is only one link and it goes to settings
 * Handles an user event and invokes the corresponding action
 *
 * @param {Event} event - user event to process
 * @return {GoogleAppsScript.Card.UniversalActionResponse}
 */
function handleResponseSettings(event) {
    event.parameters.action = "showSettings";
    return dispatchActionInternal(event, universalActionErrorHandler);
}

/**
 * Handle unexpected errors for the main universal action entry points.
 * @param {Error} err
 * @type ErrorHandler
 */
function universalActionErrorHandler(err) {
    var card = buildErrorCard({
        exception: err,
        errorText: '',
        showStackTrace: DEBUG
    });
    // return CardService.newUniversalActionResponseBuilder()
    //     .displayAddOnCards([card])
    //     .build();
    return card;
}


/**
 * Handle unexpected errors for secondary actions.
 * @param {Error} err
 * @type ErrorHandler
 */
function actionErrorHandler(err) {
    var card = buildErrorCard({
        exception: err,
        errorText: '',
        showStackTrace: DEBUG
    });
    return CardService.newActionResponseBuilder()
        .setNavigation(CardService.newNavigation().pushCard(card))
        .build();
}


/**
 * Validates and dispatches an action.
 *
 * @param {Event} event - user event to process
 * @param {ErrorHandler} opt_errorHandler - Handles errors, optionally
 *        returning a card or action response.
 * @return {GoogleAppsScript.Card.Card|GoogleAppsScript.Card.ActionResponse|GoogleAppsScript.Card.UniversalActionResponse}
 */
function dispatchActionInternal(event, opt_errorHandler) {
    if (DEBUG) {
        console.time("dispatchActionInternal");
        console.log(event);
    }

    try {
        var actionName = event.parameters.action;
        if (!actionName) {
            throw new Error("Missing action name.");
        }

        var actionFn = ActionHandlers[actionName];
        if (!actionFn) {
            throw new Error("Action not found: " + actionName);
        }

        return actionFn(event);
    } catch (err) {
        console.error(err);
        if (opt_errorHandler) {
            return opt_errorHandler(err);
        } else {
            throw err;
        }
    } finally {
        if (DEBUG) {
            console.timeEnd("dispatchActionInternal");
        }
    }
}













