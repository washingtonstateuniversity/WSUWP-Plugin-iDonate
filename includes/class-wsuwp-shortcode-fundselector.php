<?php

/**
 * plugin class file for the fundselector shortcode
 *
 * Defines the functions necessary to register our custom post types with
 * WordPress.
 *
 * @link       https://github.com/washingtonstateuniversity/WSUWP-Plugin-iDonate
 * @since      1.0.0
 *
 * @package    WSUWP_Plugin_iDonate_ShortCode_Fund_Selector
 * @author     Blair Lierman
 */
class WSUWP_Plugin_iDonate_ShortCode_Fund_Selector {

	/**
	 * Initializes the plugin by registering the hooks necessary
	 * for creating our custom post type within WordPress.
	 *
	 * @since    1.0.0
	 */
	public function init() {

		add_shortcode( 'fundselector', array( $this, 'fundselector_create_shortcode' ) );

	}

	// [fundselector embed="iDonate-embed-guid"]
	public function fundselector_create_shortcode( $atts ) {
		// $args = shortcode_atts( array(
		// 	'embed' => 'something',
		// ), $atts );

		$return_string = '<div id="fundSelectionForm">';

		// Major Categories button group
		$return_string .= '
		<div id="majorcategory" class="" role="group" aria-label="Category Selection Group">
			<a class="active" role="button" href="#" data-tab="prioritiesTab">Priorities</a>
			<a class="" role="button" data-category="programs" href="#">Programs</a>
			<a class="" role="button" data-category="colleges" href="#">Colleges</a>
			<a class="" role="button" data-category="campuses" href="#">Campuses</a>
		</div>';

		// Priorities Tab
		$priorities = $this->wsuf_fundselector_funds_get_funds( 'priorities', 'priorities' );
		$priorities_list = '<option disabled selected value> -- Select a Fund -- </option>';

		foreach ( $priorities as $priority ) {
			$fund_name = $priority['fund_name'];
			$fund_designation_id = $priority['designation_id'];
			$priorities_list .= "<option value=\"{$fund_designation_id}\">{$fund_name}</option>";
		}

		$return_string .= '
		<div id="prioritiesTab">    
			<label for="priorities">Choose one of the university\'s greatest needs</label>
			<select name="priorities" id="priorities" class="form-control fund-selection">'
				. $priorities_list .
			'</select>
		</div>';

		// Search Separator
		$return_string .= '
		<div class="search-separator">
		OR
		</div>
		';

		// Search AutoComplete
		// $search_funds = wsuf_fundselector_funds_get_all_funds();
		$option_list_funds = '';

		$return_string .= '
		<div class="form-group has-feedback">
			<label for="fundSearch">Search for any Fund: </label>
			<input id="fundSearch" type="search" class="form-control" placeholder="Search for a fund..." >
			<span class="glyphicon glyphicon-search form-control-feedback" aria-hidden="true"></span>
		</div>
		';

		// Selected Funds List
		$return_string .= '
		<ul id="selectedFunds" class="list-group">
		</ul>
		';

		// Continue button
		$return_string .= '<button type="button" id="continueButton" class="btn btn-default" disabled>Continue</button>';

		return $return_string . '</div>';
	}

	/**
	* Get a list of all categories for a specific taxonomy
	*
	* @return array $return_array
	*/
	function wsuf_fundselector_funds_get_categories( $taxonomy ) {
		$terms = get_terms( array(
			'taxonomy' => $taxonomy,
			'hide_empty' => false,
		) );

		$return_array = array();
		if ( ! empty( $terms ) && ! is_wp_error( $terms ) ) {
			//loop over each category
			foreach ( $terms as $t ) {
				$return_array[] = array( 'category_name' => $t->name );
			}
		}

		return $return_array;
	}

	/**
	* Get a list of all funds stored in the wsuf fundselector funds table
	*
	* @return array $return_array
	*/
	function wsuf_fundselector_funds_get_funds( $category, $subcategory ) {
		$fund_list = get_posts(array(
			'post_type'   => 'fund',
			'post_status' => 'any',
			'posts_per_page' => -1, // Get all posts
			'tax_query' => array(
					array(
						'taxonomy' => $category,
						'field' => 'slug',
						'terms' => $subcategory,
					),
				),
			'orderby' => 'title',
			'order' => 'ASC',
			)
		);

		$return_array = array();

		//loop over each post
		foreach ( $fund_list as $p ) {
			//get the meta you need form each post
			$des_id = get_post_meta( $p->ID, 'designationId' , true );
			$post_title = $p->post_title;
			//do whatever you want with it
			$return_array[] = array( 'fund_name' => $post_title, 'designation_id' => $des_id );
		}

		return $return_array;
	}
}