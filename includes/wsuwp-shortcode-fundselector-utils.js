// Does our namespace exist
window.wsuwpUtils = window.wsuwpUtils || {};

(function () {

    window.wsuwpUtils = {

		addListItem: function ( $list, name, designationId, amount, scholarship  ) {
			var html = '<li class="list-group-item ' + (scholarship ? "fund-scholarship": "") + '" data-designation_id="' + designationId + '" data-amount="' + amount + '">';
			html += '<span class="right">' + _.escape(name) + '</span>'
			html += '<span class="center">$</span><span id="edit' + designationId + '" class="editable left">' + amount +  '</span>';
			html += '<span class="edit"><a href="#!" id="' + designationId +'" class="edit">EDIT</a></span>';
			html += '<span class="close remove"><a href="#"></a></span>'
			html += '<span id="error' + designationId + '" class="error"></span></li>';
			
			if(!wsuwpUtils.isDuplicateDesignation(designationId, $list))
			{
				$list.append(html);

				// jQuery Editable
				var $editButton = jQuery("a#" + designationId);
				
				$editButton.click(function (e) { e.preventDefault(); } );
				
				var option = {trigger : $editButton, action : "click"};
				jQuery("span#edit" + designationId).editable(option, function(e){
					
					if( !wsuwpUtils.validateAmount(e.value) ){
						// Revert back to the original value
						e.target.html(e.old_value);
						jQuery("#error" + designationId).text("Amount must be between $3 and $100,000. Amount was reset.");
					}
					else{
						e.target.parent().attr("data-amount", e.value);
						jQuery("#error" + designationId).text("");

						wsuwpUtils.updateTotalAmountText();
					}
				});
			}

			if($list.find("li").length === 1) {
				showAnything(jQuery(".help-text"));
				var origMargin = jQuery(".help-text-caret").css('margin-left');
				
				jQuery(".help-text-caret").delay(1200);
				
				var numCategories = jQuery("#majorcategory a").length;
				var movementPercentage = numCategories ? 100 / numCategories: 0;
				
				for(var i = 0; i < numCategories - 1; i++)
				{
					jQuery(".help-text-caret").animate({marginLeft: "+=" + movementPercentage + "%"}, {duration: 500}).delay(500);
				}
				jQuery(".help-text-caret").animate({marginLeft: origMargin}, {duration: 500});
			}
			else
			{
				hideAnything(jQuery(".help-text"));
			}
		},

		isDuplicateDesignation: function (designationId, $list)
		{
			var duplicate = false;
			$list.find("li").each(function()
			{
				if(designationId == jQuery(this).attr("data-designation_id"))
				{ 
					duplicate = true;
					return false;
				}
			});

			 return duplicate;
		},

		/**
		 * Retrieves the option element with a selected designation iDonateEmbedLoad
		 * 
		 * @param {jQuery} $select The jQuery object that contains option elements (usually a select dropdown)
		 * @param {string} designationId The designation ID of the element you want to find
		 * 
		 * @returns {jQuery} The jQuery object if the option element is found or null if not found
		 */
		findElementbyDesignation: function ($select, designationId)
		{
			var $element = null;
			
			$select.find("option").each(function()
			{
				if(designationId === jQuery(this).attr("value"))
				{ 
					$element = jQuery(this);
					return false; //break out of the each loop
				}
			});

			 return $element;
		},

		validateAmount: function (intendedAmount)
		{
			var validMoneyAmount = false;

			var inputAmount = parseFloat(intendedAmount);
			if(inputAmount && _.isNumber(inputAmount) && inputAmount > 0 && intendedAmount.match(/^\d{1,5}(?:\.\d{0,2})?$/)){
				validMoneyAmount = true;
			}

			return validMoneyAmount;
		},

		getDesignationList: function ($listElement)
		{
			var designationIds = [];
			
			$listElement.find("li").each(function (index, element){
				// Element should look like '[{"id":"someId", "amount":99},{"id":"someId", "amount":99}]'
				designationIds.push({
					"id" : jQuery(element).attr("data-designation_id"),
					"amount": parseFloat(jQuery(element).attr("data-amount")) // Amount is required for the embed
				});
			})

			return designationIds;
		},

		enableButton: function ( $button ) {
			$button.prop("disabled", false);
			$button.button("enable");
		},

		disableButton: function ( $button ) {
			$button.prop("disabled", true);
			$button.button("disable");
		},

		htmlDecode: function (value) {
			return jQuery("<textarea/>").html(value).text();
		},

		// Solution from http://stackoverflow.com/a/7124052
		htmlEncode: function (str) {
			return str
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\//g, '&#x2F;');
		},

		iDonateEmbedLoad: function ($loadingCheck)
		{
			var deferred = jQuery.Deferred();
 
			var timer = setInterval(function() {
				var loadingCheckText = $loadingCheck.text()
				if(loadingCheckText === "done")
				{
					clearInterval(timer);
					deferred.resolve();
				}

				deferred.notify(loadingCheckText);
			}, 500);
			
			setTimeout(function() {
				clearInterval(timer);
				if(deferred.state() === "pending") deferred.reject();
			}, 25000); // timeout and fail if embed hasn't loaded after 25 seconds
			
			return deferred.promise();
		},

		getDonationTotal: function(designationList)
		{
			var sum = 0.0;
			
			if(designationList && designationList.length)
			{
				for (var i = 0; i < designationList.length; i++) {
					sum += parseFloat(designationList[i].amount);
				}
			}

			return sum;
		},

		updateTotalAmountText: function()
		{
			var designations = wsuwpUtils.getDesignationList(jQuery("#selectedFunds"));
			jQuery("#totalAmount").text(wsuwpUtils.getDonationTotal(designations).toFixed(2));
		},

		/**
		 * Selects a fund in a dropdown select list and shows the amount zone
		 */
		selectFundInDropdown: function($fund, designationId)
		{
			$fund.prop("selected", true);
			var fundName = $fund.text();
			jQuery("#inpDesignationId").text(designationId);
			jQuery("#inpFundName").text(fundName);
			showAmountZone();
		}

	}

})();