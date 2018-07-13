//collection of things that are useful , but not in the immediate code: for quick reference later



function reset_responses() {
    var settings = getSettingsForUser();
    settings.responses = [];
    updateSettingsForUser(settings);
    if (DEBUG) {
        console.info('reset responses',settings);
        Logger.log(settings);
    }
}

function log_settings() {
    var settings = getSettingsForUser();
    if (DEBUG) {
        console.info('reset responses',settings);
        Logger.log(settings);
    }
}