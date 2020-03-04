/**
 * Created by Kamil Golis
 */

import { LightningElement, wire, api, track } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { refreshApex } from '@salesforce/apex';

import { dataTableDeleteRow } from "c/utils";

import getObjectValues from '@salesforce/apex/FieldBasedRelatedListController.getObjectValues';
import getObjectValuesByIds from '@salesforce/apex/FieldBasedRelatedListController.getObjectsValuesByIds';
import getRelatedObjectLabel from '@salesforce/apex/FieldBasedRelatedListController.getRelatedObjectLabel';
import updateObjectIdField from '@salesforce/apex/FieldBasedRelatedListController.updateObjectIdField';

import removeItemLabel from '@salesforce/label/c.Related_List_Remove_Item';
import saveLabel from '@salesforce/label/c.ap_Save';
import saveChangesLabel from '@salesforce/label/c.ap_SaveChanges';

const actions = [
    { label: removeItemLabel, name: 'delete' }
];

export default class FieldBasedRelatedList extends LightningElement {

    @api recordId;
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

    @track rows = [];

    showCard = false;
    error;
    columnLabels;
    disableSaveButton = true;

    wiredRows;

    label = {
        removeItemLabel,
        saveLabel,
        saveChangesLabel
    };

    @api
    addNewRow(data) {
        const rowsIds = [...this.buildIds(this.rows, 'Id'), ...this.buildIds(data, 'id')];

        if (rowsIds.length <= this.maximumItems || this.maximumItems === '') {
            getObjectValuesByIds({
                    sourceIds: rowsIds.join(this.separator),
                    objectApiName: this.objectApiName,
                    relatedObjectApiName: this.relatedObjectApiName,
                    fieldApiName: this.fieldApiName,
                    recordId: this.recordId,
                    fieldsToDisplay: this.displayedColumns,
                    separator: this.separator
                })
                .then(result => {
                    this.rows = result;
                })
                .then(() => {
                    this.handleSaveButtonState();
                })
                .catch(error => {
                    this.error = error;
                });
        } else {
            this.dispatchEvent(new CustomEvent('maxitems'));
        }
    }

    @api
    saveAllRows() {
        updateObjectIdField({
                idsWithSeparator: this.buildIds(this.rows, 'Id').join(this.separator),
                objectApiName: this.objectApiName,
                fieldApiName: this.fieldApiName,
                recordId: this.recordId,
                separator: this.separator
            })
            .then(() => {
                return refreshApex(this.wiredRows);
            })
            .catch(error => {
                this.error = error;
                console.log(JSON.stringify(error));
            });
    }

    @wire(getObjectInfo, {
        objectApiName: '$relatedObjectApiName'
    })
    relatedObjectDescribe({
        error,
        data
    }) {
        if (data) {
            this.columnLabels = data.fields;
        }
    }

    @wire(getRelatedObjectLabel, {
        objectApiName: '$relatedObjectApiName'
    })
    relatedObjectLabel;

    @wire(getObjectValues, {
        objectApiName: '$objectApiName',
        relatedObjectApiName: '$relatedObjectApiName',
        fieldApiName: '$fieldApiName',
        recordId: '$recordId',
        fieldsToDisplay: '$displayedColumns',
        separator: '$separator'
    })
    handleObjectValues(result) {
        this.wiredRows = result;
        if (result.data) {
            this.rows = result.data;
            this.showCard = true;
        } else if (result.error) {
            this.error = result.error;
            this.rows = undefined;
            this.showCard = false;
        }
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        switch (actionName) {
            case 'delete':
                this.rows = dataTableDeleteRow(this.rows, row);
                this.handleSaveButtonState();
                break;
            default:
        }
    }

    handleSaveButton() {
        this.saveAllRows();
        this.disableSaveButton = true;
    }

    handleSaveButtonState() {
        if (this.autoSave) {
            this.saveAllRows();
        } else {
            this.disableSaveButton = false;
        }
    }

    buildIds(sourceArray, fieldName) {
        let rowsIds = [];
        sourceArray.forEach(row => rowsIds.push(row[fieldName]));
        return rowsIds;
    }

    get columns() {
        let columns = [];
        if (this.relatedObjectDescribe && this.columnLabels) {
            let index = 0;
            columns = this.displayedColumns.split(this.separator).map(c => {

                let fieldName = c.trim();
                let fieldLabel;

                if (this.overrideColumnsLabel) {
                    fieldLabel = this.overrideColumnsLabel.split(this.separator)[index];
                    index++;
                } else {
                    fieldLabel = this.columnLabels[fieldName].label;
                }

                return {
                    fieldName: fieldName,
                    label: fieldLabel
                };
            });
        }
        columns.push({
            type: 'action',
            typeAttributes: {
                rowActions: actions
            },
        });
        return columns;
    }

    get title() {
        return this.overrideTitle ? this.overrideTitle : this.relatedObjectLabel.data;
    }
}