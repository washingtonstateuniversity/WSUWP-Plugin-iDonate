/// <reference path="wsuwp-shortcode-fundselector-utils.js" />

jQuery(document).ready(function($) {
	// Fund Search Autocomplete
	$('#fundSearch')
		.autocomplete({
			source: function(request, response) {
				$('#fundSearch').addClass('loading');

				var restQueryUrl =
					wpData.plugin_url_base +
					'search/' +
					encodeURI(request.term);

				jQuery.getJSON(restQueryUrl).then(function(json) {
					$('#fundSearch').removeClass('loading');
					response(json);
				});
			},
			minLength: 3,
			select: function(event, ui) {
				$('#inpDesignationId').text(ui.item.designationId);
				$('#inpFundName').text(ui.item.name);
				showAmountZone();
			},
		})
		.autocomplete('widget')
		.addClass('fundselector');

	// Major Category Click Events
	$('#majorcategory a').click(function(event, deferred) {
		resetForm(true);

		$('#majorcategory a').removeClass('active');
		$('.categoryTab').addClass('hidden');

		var tabName = $(this).attr('data-tab');
		$('#' + tabName).removeClass('hidden');

		var categoryName = $(this).attr('data-category');

		if (categoryName) {
			var restUrl =
				wpData.request_url_base +
				encodeURIComponent(categoryName) +
				'?per_page=100&orderby=name';
			var category = $(this).attr('data-name');
			var description = $(this).attr('data-description') || 'category';

			var $list = $('#subcategories');
			$list.empty();
			$list.prop('disabled', true);
			$list.addClass('loading');
			$list.removeClass('fund');

			$list.append(
				'<option disabled selected value> SELECT A ' +
					category +
					'</option>'
			);
			$('label[for=subcategories]').text('Choose a ' + description);

			$.getJSON(restUrl).done(function(json) {
				var $fundList = $('#funds');
				$fundList.empty();
				$fundList.append(
					'<option disabled selected value> SELECT A FUND </option>'
				);

				$.each(json, function(key, value) {
					$list.append(
						$('<option>', {
							value: value['id'],
							'data-category': value['taxonomy'],
							'data-subcategory': value['slug'],
						}).text(wsuwpUtils.htmlDecode(value['name']))
					);
				});
				$list.prop('disabled', false);
				$list.addClass('fund');
				$list.removeClass('loading');

				if (deferred !== undefined) {
					//complete deferred function that was passed into the click event
					deferred.resolve();
				}

				$('#subcategories').focus();
			});
		}

		event.preventDefault();
	});

	// Subcategory Selected Change event
	$('#subcategories').change(function(event, deferred) {
		var category = $(this)
			.find(':selected')
			.attr('data-category');
		var subcategoryId = $(this)
			.find(':selected')
			.attr('value');

		if (category && subcategoryId) {
			// GET /wp-json/wp/v2/idonate_fund?<taxonomy_slug>=<category_id> (e.g. GET /wp-json/wp/v2/idonate_fund?idonate_priorities=35)
			var restQueryUrl =
				wpData.request_url_base +
				'idonate_fund?' +
				category +
				'=' +
				subcategoryId +
				'&per_page=100&orderby=title&order=asc';

			var $list = $('#funds');
			$list.prop('disabled', true);
			$list.addClass('loading');
			$list.removeClass('fund');

			$.getJSON(restQueryUrl).done(function(json) {
				$list.empty();
				$list.append(
					'<option disabled selected value> SELECT A FUND </option>'
				);
				$.each(json, function(key, value) {
					$list.append(
						$('<option>', { value: value['designationId'] }).text(
							wsuwpUtils.htmlDecode(value['title'].rendered)
						)
					);
				});

				$list.removeClass('loading');
				$list.addClass('fund');

				if (json.length > 0) {
					$list.prop('disabled', false);
				}

				if (deferred !== undefined) {
					//complete deferred function that was passed into the click event
					deferred.resolve();
				}

				$list.focus();
			});
		}

		event.preventDefault();
	});

	// Fund Selected Change event
	$('.fund-selection').change(function() {
		var designationId = $(this).val();
		var fundName = $(this)
			.find(':selected')
			.text();
		$('#inpDesignationId').text(designationId);
		$('#inpFundName').text(fundName);
		showAmountZone();
	});

	// Dollar Amount button click  event
	$('.amount-selection')
		.not('.other')
		.click(function(event) {
			handleAmountSelectionClick(event);
			addFundAction();
			$('#selectedFunds').focus();
		});

	// Add Fund Button click  event
	$('#addFundButton').click(function(event) {
		var amount = jQuery('#otherAmount').val();
		var roundedAmount = wsuwpUtils.roundAmount(amount);
		if (
			wsuwpUtils.validateAmount(roundedAmount, MINIMUM_GIFT, MAXIMUM_GIFT)
		) {
			jQuery('#inpAmount').val(roundedAmount);
			addFundAction();
		}
	});

	// Add fund when enter is pressed on the other amount field
	$('#otherAmount').keypress(function(e) {
		if (e.which == 13) {
			// enter key is pressed
			$('#addFundButton').click();
		}
	});

	// Add Fund Button keypress event
	$('#addFundButton').keypress(function(e) {
		if (e.which == 13) {
			// enter key is pressed
			$('#addFundButton').click();
		}
	});

	// Gift Planning Learn More click  event
	$('.gift-planning a')
		.button()
		.click(function(event) {
			$giftPlanningDescription = $(
				'.gift-planning .additional-info-description'
			);

			$(this).toggleClass('down');

			$giftPlanningDescription.animate(
				{
					opacity: 'toggle',
					height: 'toggle',
				},
				400,
				'linear'
			);
		});

	// Close Add Fund Indicator
	$('.help-text span.close a')
		.button()
		.click(function(event) {
			event.preventDefault();

			hideAnything('.help-text');
		});

	// Remove Fund Button Click Event
	// (Using body to defer binding until element has been created)
	$('body').on('click', '#selectedFunds li span.close a', function(event) {
		event.preventDefault();

		$parent = $(this)
			.parent()
			.parent()
			.parent();

		if ($parent.hasClass('fund-scholarship'))
			$('#genScholarship').prop('checked', false);

		$parent.fadeOut(1000, function() {
			$(this).remove();
			wsuwpUtils.updateTotalAmountText($('#advFeeCheck').prop('checked'));
		});

		// If the Fund list is empty, disable the Continue Button
		if ($('#selectedFunds').find('li').length === 1) {
			wsuwpUtils.disableButton($('#continueButton'));
			hideContinueButton();
			hideAnything(jQuery('.disclaimer'));
		}
	});

	// Other Amount text field Change Event
	$('#otherAmount')
		.on('input propertychange paste', function() {
			var inputAmount = $(this).val();
			var roundedAmount = wsuwpUtils.roundAmount(inputAmount);
			if (
				wsuwpUtils.validateAmount(
					roundedAmount,
					MINIMUM_GIFT,
					MAXIMUM_GIFT
				)
			) {
				$('#inpAmount').val(roundedAmount);
				wsuwpUtils.enableButton($('#addFundButton'));
				jQuery('#errorOtherAmount').text('');
			} else {
				wsuwpUtils.disableButton($('#addFundButton'));
				jQuery('#errorOtherAmount').text(
					'Amount should be between $' +
						MINIMUM_GIFT +
						' and $' +
						MAXIMUM_GIFT
				);
			}
		})
		.focus(function() {
			$(this).select();
		});

	$('.amount-selection.other').on('click', function() {
		$('.amount-selection.selected').removeClass('selected');
		$(this).addClass('selected');
		showOther();
		$('#otherAmount').focus();
		$('#addFundButton').attr('tabindex', '0');
	});

	// Continue Button Initialization and Click Event
	$('#continueButton')
		.button()
		.click(continueAction);

	$('#addFundButton').button();

	hideContinueButton();

	$('#backButton').on('click', function(event) {
		event.preventDefault();
		showForm();
	});

	$('#genScholarship').change(function() {
		// this will contain a reference to the checkbox
		if (this.checked) {
			// the checkbox is now checked
			$('#inpAmount').val($(this).attr('data-amount'));
			$('#inpDesignationId').text($(this).attr('data-designation_id'));
			$('#inpFundName').text($(this).attr('data-fund_name'));
			addFundAction(true);
		} else {
			// the checkbox is now no longer checked
			$('#selectedFunds > li.fund-scholarship').remove();

			wsuwpUtils.updateTotalAmountText($('#advFeeCheck').prop('checked'));

			// If the Fund list is empty, disable the Continue Button
			if ($('#selectedFunds').find('li').length === 0) {
				wsuwpUtils.disableButton($('#continueButton'));
				hideContinueButton();
			}
		}
	});

	$('#advFeeCheck').change(function() {
		// this will contain a reference to the checkbox
		wsuwpUtils.updateTotalAmountText(this.checked);
	});

	// if a unit is specified
	if (wpData.unit_taxonomy && wpData.unit_category) {
		loadPriorities(
			$('#unit-priorities'),
			wpData.unit_taxonomy,
			wpData.unit_category
		).done(function() {
			loadFundFromDesignationID(
				$('#unit-priorities'),
				wpData.unit_designation
			);
		});
		loadPriorities(
			$('#priorities'),
			'idonate_priorities',
			'idonate_priorities'
		);
	} else if (
		wpData.cat && // if we don't know the category, default to showing the priorities tab and populating the fund there if provided
		((!wpData.area && !wpData.unit_designation) || // Show the category tab
		(wpData.area && !wpData.unit_designation) || // Show the category and populate the area
			(wpData.area && wpData.unit_designation))
	) {
		// Show the category and populate the area and fund
		//Switch to the correct tab
		var category = $('#majorcategory').find(
			"[data-category='" + wpData.cat + "']"
		);
		var defer = $.Deferred();
		category.trigger('click', defer);
		category.addClass('active');

		if (wpData.area) {
			//Populate the subcategory after the tab has been loaded
			$.when(defer).done(function() {
				var subcategory = $('#subcategories').find(
					"[data-subcategory='" + wpData.area + "']"
				);
				subcategory.prop('selected', true);
				var deferSubcategoryChange = $.Deferred();
				subcategory.trigger('change', deferSubcategoryChange);

				if (wpData.unit_designation) {
					$.when(deferSubcategoryChange).done(function() {
						loadFundFromDesignationID(
							$('#funds'),
							wpData.unit_designation
						);
						$('.fund-selection').trigger('change');
					});
				}
			});
		}
	} else {
		loadPriorities(
			$('#priorities'),
			'idonate_priorities',
			'idonate_priorities'
		).done(function() {
			loadFundFromDesignationID(
				$('#priorities'),
				wpData.unit_designation
			);
		});
	}
});

function loadFundFromDesignationID($list, designationId) {
	if (designationId) {
		var $des = wsuwpUtils.findElementbyDesignation($list, designationId);

		// Check if the designation already exists in the priorities list and select item
		if ($des) {
			// Select and show amount buttons
			wsuwpUtils.selectFundInDropdown($des, designationId);
		} // Otherwise add it to the priorities list and select it
		else {
			// Look up the Fund Name by Designation ID
			// GET /wp-json/idonate_fundselector/v1/fund/designationId (e.g. GET /wp-json/idonate_fundselector/v1/fund/12dc5acc-07ea-4ed3-9c92-4b9ebe7c951c)
			var restQueryUrl = wpData.plugin_url_base + 'fund/' + designationId;

			jQuery.getJSON(restQueryUrl).then(function(json) {
				if (json.length > 0) {
					// Add to priorities
					var $fund = jQuery('<option>', {
						value: json[0]['designation_id'],
					}).text(wsuwpUtils.htmlDecode(json[0]['fund_name']));
					$list.append($fund);

					// Select and show amount buttons
					wsuwpUtils.selectFundInDropdown($fund, designationId);
				}
			});
		}
	}
}

function loadPriorities($list, category, subcategory) {
	if ($list.find('option').length <= 1 && category && subcategory) {
		// GET /wp-json/idonate_fundselector/v1/funds/category/subcategory (e.g. GET /wp-json/idonate_fundselector/v1/funds/idonate_priorities/idonate_priorities)
		var restQueryUrl =
			wpData.plugin_url_base + 'funds/' + category + '/' + subcategory;

		return jQuery.getJSON(restQueryUrl).then(function(json) {
			$list.empty();
			$list.append(
				'<option disabled selected value> SELECT A FUND </option>'
			);
			jQuery.each(json, function(key, value) {
				$list.append(
					jQuery('<option>', { value: value['designation_id'] }).text(
						wsuwpUtils.htmlDecode(value['fund_name'])
					)
				);
			});

			if (json.length > 0) {
				$list.prop('disabled', false);
			}
		});
	}

	//return an already resolved promise (http://stackoverflow.com/a/33656679)
	return jQuery.when();
}

function addFundAction(scholarship) {
	var designationId = jQuery('#inpDesignationId').text();
	var fundName = jQuery('#inpFundName').text();

	if (designationId && fundName) {
		wsuwpUtils.addListItem(
			jQuery('#selectedFunds'),
			fundName,
			designationId,
			jQuery('#inpAmount').val(),
			scholarship
		);
		wsuwpUtils.enableButton(jQuery('#continueButton'));

		wsuwpUtils.updateTotalAmountText(
			jQuery('#advFeeCheck').prop('checked')
		);
		showAnything(jQuery('.disclaimer'));
		showContinueButton();
		resetForm();
	}
}

/**
 * Resets the plugin elements back to their default states
 *
 * @param {boolean} immediate If true, certain elements hide right away instead of fading out (like on tab switch)
 */
function resetForm(immediate) {
	jQuery('#fundSearch').val('');
	jQuery('.fund-selection').prop('selectedIndex', 0);
	jQuery('.category-selection').prop('selectedIndex', 0);
	setTimeout(function() {
		jQuery('.amountwrapper .selected').removeClass('selected');
	}, 1300);
	if (immediate) {
		jQuery('.amountwrapper.wrapper').hide();
		jQuery('.otherprice').hide();
		jQuery('#errorOtherAmount').hide();
	} else {
		hideAmountZone();
		hideOther();
	}
}

function handleAmountSelectionClick(event) {
	var $this = jQuery(event.target);
	if ($this.attr('data-amount')) {
		jQuery('#inpAmount').val($this.attr('data-amount'));

		jQuery('.amount-selection').removeClass('selected');
		$this.addClass('selected');
	}
}

function continueAction(event) {
	if (event) event.preventDefault();

	var designations = wsuwpUtils.getDesignationList(jQuery('#selectedFunds'));

	if (designations && designations.length > 0) {
		hideForm();

		var $advFeeCheck = jQuery('#advFeeCheck');

		if ($advFeeCheck.prop('checked')) {
			for (var i = 0; i < designations.length; i++) {
				// The new new calculation formula is "total * (1 + fee%) - total" to cover fee
				var advFeeDecimal =
					designations[i].amount *
						(1 + wpData.adv_fee_percentage * 0.01) -
					designations[i].amount;

				// Rounding based on this answer: http://stackoverflow.com/a/5191166
				designations[i].amount += parseFloat(
					(Math.ceil(advFeeDecimal * 1000) / 1000).toFixed(2)
				);
			}
		}

		if (designations.length === 1) {
			// Clear fields used by mulitple designations
			jQuery('#iDonateEmbed').attr('data-custom_gift_amount', null);
			jQuery('#iDonateEmbed').attr('data-designations', null);

			var des = designations[0];

			// Add the designation as an attribute
			jQuery('#iDonateEmbed').attr('data-designation', des.id);

			var giftArrays = [[null, des.amount]]; //if the name is set not null, then it will show up on the red amount button (it will be html encoded)

			var designationsString = JSON.stringify(designations);
			// Add the designations as an attribute
			jQuery('#iDonateEmbed').attr(
				'data-designations',
				designationsString
			);

			jQuery('#iDonateEmbed').attr(
				'data-gift_arrays',
				JSON.stringify(giftArrays)
			);
			jQuery('#iDonateEmbed').attr('data-cash_default', des.amount);
		} else {
			// Clear fields used by single designation
			jQuery('#iDonateEmbed').attr('data-designation', null);
			jQuery('#iDonateEmbed').attr('data-gift_arrays', null);
			jQuery('#iDonateEmbed').attr('data-cash_default', null);

			// Turn the list of designations into a JSON string
			var designationsString = JSON.stringify(designations);

			// Add the designations as an attribute
			jQuery('#iDonateEmbed').attr(
				'data-designations',
				designationsString
			);

			var sum = 0;

			for (var i = 0; i < designations.length; i++) {
				sum += parseFloat(designations[i].amount);
			}

			jQuery('#iDonateEmbed').attr('data-custom_gift_amount', sum);
		}

		if (jQuery('#gpInWill').prop('checked')) {
			jQuery('#iDonateEmbed').attr(
				'data-custom_note_4',
				'WSU is in my will/estate plan!'
			);
		} else {
			jQuery('#iDonateEmbed').attr('data-custom_note_4', '');
		}

		if (jQuery('#gpMoreInfo').prop('checked')) {
			jQuery('#iDonateEmbed').attr(
				'data-custom_note_5',
				'I would like more information about putting WSU in my will/estate plan'
			);
		} else {
			jQuery('#iDonateEmbed').attr('data-custom_note_5', '');
		}

		var referenceCode = {
			donorPaysFee: $advFeeCheck.prop('checked'),
			feePercentage: parseFloat(wpData.adv_fee_percentage),
		};

		var stringifiedRefCode = '/' + JSON.stringify(referenceCode) + '/';
		stringifiedRefCode = stringifiedRefCode.replace(/"/g, '\\"');

		jQuery('#iDonateEmbed').attr('data-reference_code', stringifiedRefCode);

		// Initialize the iDonate embed
		initializeEmbeds();

		$loadingMessage = jQuery('#embedLoadingMessage');
		$loadingMessage.show();

		wsuwpUtils
			.iDonateEmbedLoad(jQuery('#loadingCheck'))
			.then(function loaded() {
				jQuery('#iDonateEmbed iframe').show();
				$loadingMessage.hide();
			});
	} else jQuery('#iDonateEmbed iframe').hide();
}

function showForm() {
	showAnything(jQuery('#firstform'));
	hideAnything(jQuery('#secondform'));
}

function hideForm() {
	hideAnything(jQuery('#firstform'));
	showAnything(jQuery('#secondform'));
}

function showAmountZone() {
	showAnything(jQuery('.amountwrapper.wrapper'));
}

function hideAmountZone() {
	hideAnything(jQuery('.amountwrapper.wrapper'));
}

function showContinueButton() {
	showAnything(jQuery('.continuebutton, .disclaimer, .additional-info'));
}

function hideContinueButton() {
	hideAnything(jQuery('.continuebutton, .disclaimer, .additional-info'));
}

function showOther() {
	showAnything(jQuery('.otherprice'));
	showAnything(jQuery('#errorOtherAmount'));
}

function hideOther() {
	hideAnything(jQuery('.otherprice'));
	hideAnything(jQuery('#errorOtherAmount'));
}

function showAnything(element) {
	jQuery(element)
		.animate({ opacity: 1 }, { duration: 300 })
		.show()
		.delay(1000);
}

function hideAnything(element) {
	jQuery(element).animate({ opacity: 0 }, { duration: 1000 });
	setTimeout(function() {
		jQuery(element).hide();
	}, 1100);
}

jQuery(document).ready(function() {
	jQuery('#majorcategory a').on('click', function() {
		jQuery('.form-group.search').addClass('hidden');
		jQuery('#majorcategory a.active').removeClass('active');
		jQuery(this).addClass('active');
	});
	jQuery('.search').on('click', function() {
		jQuery('.form-group.search').removeClass('hidden');
	});
	jQuery('button.amount-selection:last').addClass('lastbutton');
});

jQuery.extend(jQuery.ui.autocomplete.prototype.options, {
	open: function(event, ui) {
		jQuery(this)
			.autocomplete('widget')
			.css({
				width: jQuery(this).width() + 'px',
			});

		var length = jQuery(this).autocomplete('widget')[0].childNodes.length;
		var $lastNode = jQuery(this).autocomplete('widget')[0].childNodes[
			length - 1
		];

		if (
			$lastNode.innerText.indexOf(
				'narrow down your search'.toUpperCase()
			) != -1
		) {
			jQuery('#' + $lastNode.id).prop('disabled', true);
		}
	},
});
