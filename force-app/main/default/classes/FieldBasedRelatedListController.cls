/**
 * Created by Kamil Golis
 */

public with sharing class FieldBasedRelatedListController {

	private static final Integer MAX_RESULTS = 5;

	/**
	 * @description Method for getting generic SObject with values from parameters.
	 *
	 * @param objectApiName API name of main object (for example PricingRequest__c)
	 * @param relatedObjectApiName API name of related object (for example Account)
	 * @param fieldApiName API name of the field that stores Ids for related object separated by separator, for example Accounts__c
	 * @param recordId current record Id
	 * @param fieldsToDisplay String with field names separated by separator that will be shown in table
	 * @param separator character that separates fieldApiName and fieldsToDisplay
	 *
	 * @return List of SObjects for given criteria
	 */
	@AuraEnabled(Cacheable=true)
	public static List<Object> getObjectValues(String objectApiName, String relatedObjectApiName, String fieldApiName,
			Id recordId, String fieldsToDisplay, String separator) {
		try {
			return getObjects(null, separator, fieldApiName, objectApiName, recordId, fieldsToDisplay, relatedObjectApiName);
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	/**
	 * @description Method is similar to getObjectValues except it takes sourceIds String with all Ids separated by separator.
	 *
	 * @param sourceIds String with Ids (from frontend) separated with separator
	 *
	 * @return List of SObjects for given criteria
	 */
	@AuraEnabled(Cacheable=true)
	public static List<Object> getObjectsValuesByIds(String sourceIds, String objectApiName, String relatedObjectApiName,
			String fieldApiName, Id recordId, String fieldsToDisplay, String separator) {
		try {
			return getObjects(sourceIds, separator, fieldApiName, objectApiName, recordId, fieldsToDisplay, relatedObjectApiName);
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	/**
	 * @description Method to update generic SObject
	 *
	 * @param idsWithSeparator String with Ids separated by separator
	 */
	@AuraEnabled
	public static void updateObjectIdField(String idsWithSeparator, String objectApiName, String fieldApiName, Id recordId, String  separator) {
		if (String.isNotBlank(idsWithSeparator) && !areIdsTheSame(idsWithSeparator, objectApiName, fieldApiName, recordId, separator)) {
			try {

				SObject record = recordId.getSobjectType().newSObject(recordId);
				record.put(fieldApiName, idsWithSeparator);
				update record;
			} catch (Exception e) {
				throw new AuraHandledException(e.getMessage());
			}
		}
	}

	/**
	 * @description Method to compare two Strings with Ids to check if both has the same amount of items. Used to check is update is needed.
	 * Because Ids will be always unique then only checking items count from same field is required.
	 *
	 * @return true if item count is the same.
	 */
	@TestVisible
	private static Boolean areIdsTheSame(String idsWithSeparator, String objectApiName, String fieldApiName, Id recordId, String separator) {
		if (String.isNotBlank(idsWithSeparator)) {
			String queryString = buildQueryString(objectApiName, fieldApiName, recordId);
			List<SObject> objects = Database.query(queryString);

			if (objects.size() > 0) {
				String idsField = (String) objects.get(0).get(fieldApiName);
				if (idsField == null) return false;

				List<String> objectIds = removeSpaces(idsField).split(separator);
				List<String> sourceIds = removeSpaces(idsWithSeparator).split(separator);

				if (objectIds.size() != sourceIds.size()) return false;

				Integer count = 0;
				for (String s : sourceIds) {
					if (objectIds.contains(s)) {
						count++;
					}
				}

				if (sourceIds.size() == count) return true;
			}
		}
		return false;
	}

	private static String removeSpaces(String input) {
		return input.replace(' ', '');
	}

	private static String buildQueryString(String objectApiName, String fieldApiName, String recordId) {
		return 'SELECT Id, ' + fieldApiName + ' FROM ' + objectApiName + ' WHERE Id = :recordId LIMIT 1';
	}

	/**
	 * @description Method that will prepare query and get SObject.
	 *
	 * @return List of SObjects based on criteria
	 */
	private static List<Object> getObjects(String idsWithSeparator, String separator, String fieldApiName, String objectApiName, Id recordId,
			String fieldsToDisplay, String relatedObjectApiName) {
		String columnSeparator = String.isBlank(separator) ? ';' : separator;
		String queryString = buildQueryString(objectApiName, fieldApiName, recordId);
		List<SObject> mainObject = Database.query(queryString);

		if (mainObject.size() > 0) {
			List<String> ids = new List<String>();

			String idsField = String.isNotBlank(idsWithSeparator) ? idsWithSeparator : (String) mainObject.get(0).get(fieldApiName);

			if (String.isNotBlank(idsField)) {

				for (String i : idsField.split(columnSeparator)) {
					ids.add(i.trim());
				}

				String fields = '';
				for (String field : fieldsToDisplay.split(columnSeparator)) {
					fields += field + ', ';
				}
				fields = fields.left(fields.length() - 2);

				queryString = 'SELECT Id, ' + fields + ' FROM ' + relatedObjectApiName + ' WHERE Id IN :ids';
				return Database.query(queryString);
			}
		}
		return new List<Object>();
	}

	/**
	 * @description Method to return plural label name for given object
	 *
	 * @param objectApiName API name of object
	 *
	 * @return String with plural name
	 */
	@AuraEnabled(Cacheable=true)
	public static String getRelatedObjectLabel(String objectApiName) {
		List<DescribeSObjectResult> results = Schema.describeSObjects(new List<String>{
				objectApiName
		});
		return results[0].getLabelPlural();
	}

	/**
	 * @description Generic search method used in fieldBasedRelatedListWithSearch component.
	 *
	 * @param searchTerm String with search term that will be used in LIKE sequence
	 * @param selectedIds String with Ids from frontend that will not be used in query, this is usually list of all selected items
	 * @param relatedObjectApiName API name of related object - the object that will be queried
	 * @param fieldsToDisplay String with API names of all fields from table used in query, separated by separator
	 * @param separator Separator character
	 * @param searchField API name of search field, this field is used in query AND <searchField> LIKE
	 * @param subTitleField String with API name for field that will be used as subtitle in results window (need to be included in query - in fieldsToDisplay)
	 * @param condition String with additional condition, it can be for example RecordType.Name
	 * @param conditionParam String with additional condition params for example ='HCO'
	 * @param icon String with name of icon
	 *
	 * @return List with LookupSearchResult records
	 */
	@AuraEnabled(Cacheable=true)
	public static List<FieldBasedRelatedListController.LookupSearchResult> search(String searchTerm, List<String> selectedIds,
			String relatedObjectApiName, String fieldsToDisplay, String separator, String searchField, String subTitleField,
			String condition, String conditionParam, String icon) {

		List<LookupSearchResult> results = new List<LookupSearchResult>();

		try {
			String queryString = 'SELECT Id, ';
			String columnSeparator = String.isBlank(separator) ? ';' : separator;

			List<String> fields = fieldsToDisplay.split(columnSeparator);


			Boolean includeSearchField = false;

			if (fields.size() > 0) {
				for (String field : fields) {
					if (field == searchField) includeSearchField = true;
					queryString += field + ', ';
				}

				if (!includeSearchField)	{
					queryString += searchField;
				} else {
					queryString = queryString.left(queryString.length() - 2);
				}

				queryString += ' FROM ' + relatedObjectApiName + ' WHERE ' + searchField + ' LIKE \'%' + searchTerm + '%\'';

				if (String.isNotBlank(condition) && String.isNotBlank(conditionParam)) {
					queryString += ' AND ' + condition + conditionParam;
				}

				queryString += ' AND Id NOT IN :selectedIds LIMIT ' + MAX_RESULTS;

				System.debug(queryString);
				List<SObject> objects = Database.query(queryString);

				System.debug(objects);
				for (SObject obj : objects) {
					String subTitleValue = (String) obj.get(subTitleField);
					results.add(new LookupSearchResult(obj.Id, relatedObjectApiName, icon, (String) obj.get(searchField),
							String.isBlank(subTitleValue) ? '' : subTitleValue));
				}
			}
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
		return results;
	}

	/**
	 * Inner class for storing generic query results
	 */
	@TestVisible
	class LookupSearchResult {

		private Id id;
		private String sObjectType;
		private String icon;
		private String title;
		private String subtitle;

		public LookupSearchResult(Id id, String sObjectType, String icon, String title, String subtitle) {
			this.id = id;
			this.sObjectType = sObjectType;
			this.icon = icon;
			this.title = title;
			this.subtitle = subtitle;
		}

		@AuraEnabled
		public Id getId() {
			return id;
		}

		@AuraEnabled
		public String getSObjectType() {
			return sObjectType;
		}

		@AuraEnabled
		public String getIcon() {
			return icon;
		}

		@AuraEnabled
		public String getTitle() {
			return title;
		}

		@AuraEnabled
		public String getSubtitle() {
			return subtitle;
		}
	}
}