/**
 * Created by Kamil Golis 
 * This component is using also : c-ui-utils, c-lookup and c-field-based-related-list
 *
 * ApexSearch is made from generic controller search method, if necessary you can use your own search method,
 * just create additional class with search function based on inner class from FieldBasedRelatedListController.
 * Do not overwrite this component, just add new property (Boolean) to use non-generic method and put it in comment section below.
 */

import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { parseProxy } from "c/utils";

// Generic search function
import apexSearch from '@salesforce/apex/FieldBasedRelatedListController.search';
// Put here your search function
//import apexSearchAlt from '@salesforce/apex/FieldBasedRelatedListController.search';

import addLabel from '@salesforce/label/c.ap_Add';

// Util components
const UTILS = 'c-ui-utils';
const LOOKUP = 'c-lookup';
const RELATED_LIST = 'c-field-based-related-list';

export default class FieldBasedRelatedListWithSearch extends LightningElement {

    // General settings
    @api notifyViaAlerts = false;
    @api disabled;
    @api required;
    @api recordId;
    @api isMultiEntry;
    @api componentTitle;
    @api searchLabel;
    @api searchPlaceholder;

    // Public fields for setting field based related list component.
    @api objectApiName;
    @api relatedObjectApiName;
    @api fieldApiName;
    @api displayedColumns;
    @api overrideColumnsLabel;
    @api overrideTitle;
    @api separator;
    @api showTitle;
    @api icon;
    @api autoSave;
    @api maximumItems;

    // Public settings for generic search
    @api useGenericSearch;
    @api searchField;
    @api subTitleField;
    @api condition;
    @api conditionParam;

    @track initialSelection = [];
    @track errors = [];
    @track selectedRecord = [];

    disableAdd = true;

    utils;
    lookup;
    relatedList;

    label = {
        addLabel
    };

    renderedCallback() {
        this.utils = this.template.querySelector(UTILS);
        this.lookup = this.template.querySelector(LOOKUP);
        this.relatedList = this.template.querySelector(RELATED_LIST);
    }

    handleLookupTypeChange(event) {
        this.initialSelection = [];
        this.errors = [];
        this.isMultiEntry = event.target.checked;
    }

    handleSearch(event) {
        let params = {
            relatedObjectApiName: this.relatedObjectApiName,
            fieldsToDisplay: this.displayedColumns,
            separator: this.separator,
            searchField: this.searchField,
            subTitleField: this.subTitleField,
            condition: this.condition,
            conditionParam: this.conditionParam,
            icon: this.icon
        };
        const searchParams = {
            ...event.detail,
            ...params
        };
        if (this.useGenericSearch) {
            apexSearch(searchParams)
                .then(results => {
                    this.lookup.setSearchResults(results);
                })
                .catch(error => {
                    this.notifyUser('Lookup Error', 'An error occurred while searching with the lookup field.', 'error');
                    console.error('Lookup error', JSON.stringify(error));
                    this.errors = [error];
                });
        } else {
            /*
            Put your search method below.

            apexSearchAlt(event.detail)
				.then(results => {
					this.lookup.setSearchResults(results);
				})
				.catch(error => {
					this.notifyUser('Lookup Error', 'An error occurred while searching with the lookup field.', 'error');
					console.error('Lookup error', JSON.stringify(error));
					this.errors = [error];
				});
			*/
        }

    }

    handleSelectionChange() {
        this.errors = [];
        this.selectedRecord = this.lookup.getSelection();
        this.disableAdd = this.selectedRecord.length === 0;
    }

    handleSubmit() {
        this.checkForErrors();
        if (this.errors.length === 0) {
            this.notifyUser('Success', 'The form was submitted.', 'success');
        }
    }

    handleAddButton() {
        if (this.selectedRecord.length !== 0) {
            this.relatedList.addNewRow(this.selectedRecord);
            this.selectedRecord = this.initialSelection = [];
            this.disableAdd = true;
        }
    }

    handleMaxItems() {
        const message = `List reached maximum ${this.maximumItems} items.`;
        this.utils.showToast('Info.', message, 'warning');
    }

    checkForErrors() {
        const selection = this.lookup.getSelection();
        if (selection.length === 0) {
            this.errors = [{
                    message: 'You must make a selection before submitting!'
                },
                {
                    message: 'Please make a selection and try again.'
                }
            ];
        } else {
            this.errors = [];
        }
    }

    notifyUser(title, message, variant) {
        if (this.notifyViaAlerts) {
            alert(`${title}\n${message}`);
        } else {
            this.utils.showToast(title, message, variant);
        }
    }
}