/**
 * Created by Kamil Golis
 */

/**
 * Parse proxy object to plain JSON object
 * @param {object} proxyObj - proxy object
 * @return {JSON} JSON object from proxy object
 */
const parseProxy = (proxyObj) => {
    return JSON.parse(JSON.stringify(proxyObj));
}

/**
 * Data table delete row function
 * @param {object[]} data - array of objects containing data table rows data
 * @param {object} row - array of objects containing data table rows data
 * @return {object[]} array of objects without row
 */
const dataTableDeleteRow = (data, row) => {
    const {
        id
    } = row;
    const index = dataTableFindRowIndexById(data, id);
    if (index !== -1) {
        data = data
            .slice(0, index)
            .concat(data.slice(index + 1));
    }
    return data;
}

/**
 * Data table find row by Id
 * @param {object[]} data - array of objects containing data table rows data
 * @param {string} id - id of a row
 * @return {decimal} index number of found row
 */
const dataTableFindRowIndexById = (data, id) => {
    let ret = -1;
    data.some((row, index) => {
        if (row.id === id) {
            ret = index;
            return true;
        }
        return false;
    });
    return ret;
}

/**
 * Data table delete selected row function
 * @param {object[]} data - array of objects containing data table rows data
 * @param {object[]} selectedRows - array of objects containing all selected rows
 * @return {object[]} array of objects without selected rows
 */
const dataTableDeleteSelectedRows = (data, selectedRows) => {
    return data.filter(({
        id: idVal1
    }) => !selectedRows.some(({
        id: idVal2
    }) => idVal2 === idVal1));
}

/**
 * Reduces one or more LDS errors into a string[] of error messages.
 * @param {FetchResponse|FetchResponse[]} errors
 * @return {String[]} Error messages
 */
export function reduceErrors(errors) {
    if (!Array.isArray(errors)) {
        errors = [errors];
    }

    return (
        errors
        // Remove null/undefined items
        .filter(error => !!error)
        // Extract an error message
        .map(error => {
            // UI API read errors
            if (Array.isArray(error.body)) {
                return error.body.map(e => e.message);
            }
            // UI API DML, Apex and network errors
            else if (error.body && typeof error.body.message === 'string') {
                return error.body.message;
            }
            // JS errors
            else if (typeof error.message === 'string') {
                return error.message;
            }
            // Unknown error shape so try HTTP status text
            return error.statusText;
        })
        // Flatten
        .reduce((prev, curr) => prev.concat(curr), [])
        // Remove empty strings
        .filter(message => !!message)
    );
}

// EXPORTS
export {
    parseProxy,
    dataTableDeleteRow,
    dataTableFindRowIndexById,
    dataTableDeleteSelectedRows
}