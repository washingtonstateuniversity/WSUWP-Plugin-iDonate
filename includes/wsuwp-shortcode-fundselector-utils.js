// Does our namespace exist
window.wsuwpUtils = window.wsuwpUtils || {};

(function () {

    window.wsuwpUtils = {

		addListItem: function ( $list, name, designationId, amount  ) {	
			var html = '<li class="list-group-item" data-designation_id="' + designationId + '" data-amount="' + amount + '">' + _.escape(name);
			html += ' ($<span id="edit' + designationId + '" class="editable">' + amount +  '</span>)';
			html += '<input id="' + designationId +'" class="edit" type="button" value="Edit Amount"></input>';
			html += '<a href="#" class="remove pull-right"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span><span class="sr-only">Remove Fund button</span></a></li>';
			
			if(!wsuwpUtils.isDuplicateDesignation(designationId, $list))
			{
				$list.append(html);

				// jQuery Editable
				var $editButton = jQuery("input#" + designationId);
				
				$editButton.click(function (e) { e.preventDefault(); } );
				
				var option = {trigger : $editButton, action : "click"};
				jQuery("span#edit" + designationId).editable(option, function(e){
					
					if( !wsuwpUtils.validateAmount(e.value) ){
						// Revert back to the original value
						e.target.html(e.old_value);
					}
					else{
						e.target.parent().attr("data-amount", e.value);
					}
				});
			}
		},

		isDuplicateDesignation: function (designationId, $list)
		{
			var duplicate = false;
			$list.each(function()
			{
				if(designationId == jQuery(this).find("li").attr("data-designation_id"))
				{ 
					duplicate = true;
					return false;
				}
			});

			 return duplicate;
		},

		validateAmount(intendedAmount)
		{
			var validMoneyAmount = false;

			var inputAmount = parseFloat(intendedAmount);
			if(inputAmount && _.isNumber(inputAmount) && inputAmount > 0 && intendedAmount.match(/^\d{1,5}(?:\.\d{1,2})?$/)){
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
					"amount": jQuery(element).attr("data-amount") // Amount is required for the embed
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
		}


	}

})();