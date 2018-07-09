//collection of things that are useful , but not in the immediate code: for quick reference later

/**
 *
 * @param {Event} e
 * @return {GoogleAppsScript.Card.UniversalActionResponse}
 */
function openContactURL(e) {
    // Activate temporary Gmail add-on scopes, in this case so that the
    // open message metadata can be read.
    var accessToken = e.messageMetadata.accessToken;
    GmailApp.setCurrentMessageAccessToken(accessToken);

    // Build URL to open based on a base URL and the sender's email.
    var messageId = e.messageMetadata.messageId;
    var message = GmailApp.getMessageById(messageId);
    var sender = message.getFrom();
    var url = "https://gokabam.com/" + sender;
    return CardService.newUniversalActionResponseBuilder()
        .setOpenLink(CardService.newOpenLink()
            .setUrl(url))
        .build();
}