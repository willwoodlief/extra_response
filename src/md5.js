/**
 * I Added, and very slightly modified, the open source function to get MD5 strings.
 * @author https://gist.github.com/KEINOS/78cc23f37e55e848905fc4224483763d
 * ------------------------------------------
 *   MD5 function for GAS(GoogleAppsScript)
 *
 * You can get a MD5 hash value and even a 4digit short Hash value of a string.
 * ------------------------------------------
 * Usage1:
 *   `=MD5("YourStringToHash")`
 *     or
 *   `=MD5( A1 )` with the same string at A1 cell
 *   result:
 *     `FCE7453B7462D9DE0C56AFCCFB756193`.
 *     For your sureness you can verify it in your terminal as below.
 *     `$ md5 -s "YourStringToHash"`
 * Usage2:
 *   `=MD5("YourStringToHash", true)` for short Hash
 *    result:
 *     `6MQH`
 *     Note that it has more conflict probability.
 *
 * Author:
 *   KEINOS @ https://github.com/keinos
 * Reference and thanks to:
 *   https://stackoverflow.com/questions/7994410/hash-of-a-cell-text-in-google-spreadsheet
 * ------------------------------------------
 *
 * @param {string} input The value to hash.
 * @param {boolean} isShortMode Set true for 4 digit shortend hash, else returns usual MD5 hash.
 * @return {string} The hashed input
 *
 */
function MD5( input, isShortMode )
{
    if (!B_USE_NEW_HASHES) {return input;}
    var txtHash = '';
    var rawHash = Utilities.computeDigest(
        Utilities.DigestAlgorithm.MD5,
        input,
        Utilities.Charset.UTF_8 );


    if ( ! isShortMode ) {
        for ( var i = 0; i < rawHash.length; i++ ) {

            var hashVal = rawHash[i];

            if ( hashVal < 0 ) {
                hashVal += 256;
            }
            if ( hashVal.toString( 16 ).length === 1 ) {
                txtHash += '0';
            }
            txtHash += hashVal.toString( 16 );
        }
    } else {
        for ( var j = 0; j < 16; j += 8 ) {

            hashVal = ( rawHash[j]   + rawHash[j+1] + rawHash[j+2] + rawHash[j+3] )
                ^ ( rawHash[j+4] + rawHash[j+5] + rawHash[j+6] + rawHash[j+7] );

            if ( hashVal < 0 ) {
                hashVal += 1024;
            }
            if ( hashVal.toString( 36 ).length === 1 ) {
                txtHash += "0";
            }

            txtHash += hashVal.toString( 36 );
        }
    }

    // change below to "txtHash.toLowerCase()" for lower case result.
    return txtHash.toUpperCase();

}