<?php

/**
 * plugin class file for the idonate_thankyoupage shortcode
 *
 * Defines the functions necessary to register our custom thank you page enclosing shortcode
 *
 * @link       https://github.com/washingtonstateuniversity/WSUWP-Plugin-iDonate
 * @since      0.0.20
 *
 * @package    WSUWP_Plugin_iDonate_ShortCode_ThankYouPage
 * @author     Blair Lierman
 */
class WSUWP_Plugin_iDonate_ShortCode_ThankYouPage {

	/**
	 * Initializes the shortcode by registering the hooks necessary
	 * for creating our shortcode within WordPress.
	 *
	 * @since 0.0.20
	 */
	public function init() {

		add_shortcode( 'idonate_thankyoupage', array( $this, 'thankyoupage_create_shortcode' ) );
	}

	 /**
	 * Defines the Thank You Page shortcode and applies the templating to the content
	 * Usage: [idonate_thankyoupage]Thank You Page Content[/idonate_thankyoupage]
	 *
	 * @since 0.0.20
	 */
	public function thankyoupage_create_shortcode( $atts, $content = null ) {
		$args = shortcode_atts( array(
			'redirect_url' => get_site_url(),
			'debug' => false,
		), $atts );

		$query_params = $this->parse_querystring();

		if ( empty( $query_params['donor.id'] ) ) {
			return 'Thank you for your donation. <br /> Please go to our <a href="' . esc_url( $args['redirect_url'] ) . '">Online Giving site</a> if you would like to give again.';
		}

		// Set a basic template if none given
		if ( empty( $content ) ) {
			$content = '
			<h3><strong>Donation Summary:</strong></h3><br />
			Donor number: {{donor.id}}<br />
			Date: {{created}}<br />
			Approval Code: {{transaction_id}}<br />

			<p style="white-space: pre-line;">
			<strong>Billing Information</strong>
			{{donor.contact.firstname}} {{donor.contact.lastname}}
			{{donor.contact.address.street}}
			{{if donor.contact.address.street2}}{{donor.contact.address.street2}}{{end}}
			{{donor.contact.address.city}}, {{donor.contact.address.state}} {{donor.contact.address.zip}}
			{{donor.contact.address.country_name}}
			{{donor.contact.phone}}
			{{donor.contact.email}}
			</p>

			{{if comments}}Gift comments: {{comments}}{{end}}

			{{if value}}
			<p style="white-space: pre-line;">
			Total Amount Charged: $<span />{{value}}
			to your {{card_type}} with the last four {{last_four}}
			</p>
			{{end}}

			<p>
				<h5>WSU Foundation</h5><br />
				<em>255 E. Main Street, Suite 201</em><br />
				<em> PO Box 641927</em><br />
				<em> Pullman, WA 99164-1927</em><br />
				<em> Phone: 509-335-1686 or 800-GIV-2-WSU (448-2978)</em><br />
				<em> Fax: 509-335-5903</em><br />
				<em> E-mail: foundation@wsu.edu</em><br />
			</p>
			';
		}

		$content = $this->replace_conditionals( $content, $query_params );

		foreach ( $query_params as $key => $value ) {
			if ( ( 'donor.id' === $key || 'transaction_id' === $key ) && $value ) {
				$value = strtoupper( substr( $value, 0, 8 ) );
			} elseif ( 'created' === $key && $value ) {
				$value = date( 'm/d/Y', strtotime( $value ) );
			} elseif ( 'card_type' === $key && $value ) {
				$value = ucwords( $value );
			} elseif ( 'subtype' === $key && 'echeck' === $value ) {
				$value = 'eCheck';
			} elseif ( 'value' === $key && $value ) {
				$value = number_format( $value, 2 );
				$value = '$' . $value;
			}

			$content = str_replace( '{{' . $key . '}}', esc_html( $value ), $content );
		}

		$content = $this->replace_nonmatched( $content, $args['debug'] );

		return $content;
	}

	/**
	* Parses out the query string passed by iDonate and creates a list of params
	*
	* @since 0.0.20
	*
	* @return array $return_array
	**/
	private function parse_querystring() {
		$return_array = array();
		if ( ! empty( $_GET ) ) {

			$query_params =  $_GET ;
			// Parse Donor query param as JSON
			$query_params["donor"] = json_decode(stripslashes(nl2br($query_params["donor"])), true);
			
			$query_params = $this->array_flatten( $query_params );

			//loop over each category
			foreach ( $query_params as $key => $qp ) {
				// print_r( $key . ":" . $qp . "<br />" );
				$return_array[ $key ] = $qp;
			}
		}

		return $return_array;
	}

	/**
	* Flattens an array, but keep the naming structure by using . in the key name
	* Based on the example found at http://stackoverflow.com/a/14972714
	*
	* @param array $array The array to flatten
	* @param string $parent The name of the parent node(s), passed recursively
	*
	* @since 0.0.20
	*
	* @return array $return
	**/
	private function array_flatten( $array, $parent = '' ) {

		$parent = $parent . (empty( $parent ) ? '' : '.');

		$return = array();
		foreach ( $array as $key => $value ) {
			if ( is_array( $value ) ) {
				$return = array_merge( $return, $this->array_flatten( $value, $parent . $key ) );
			} else { $return[ $parent . $key ] = $value; }
		}

		return $return;
	}

	/**
	* Checks for any conditionals and replaces or removes them depending on if the condition is fulfilled
	* Template style based on https://developers.sparkpost.com/api/substitutions-reference.html#header-if-then-else-syntax
	* Matching based on https://github.com/slimndap/wp-theatre/blob/master/functions/template/wpt_template.php
	*
	* @param string $content The content from shortcode
	* @param array $query_params The flattened list of query parameters passed to the shortcode page
	*
	* @since 0.0.20
	*
	* @return string $content
	**/
	private function replace_conditionals( $content, $query_params ) {
		$tags = array();
		// This RegEx captures values inside {{if <value>}}{{end}} blocks (as well as any optional surrounding <p> or ending <br /> tags)
		preg_match_all( '/(?:\<p\>)?{{if\s+(.*?)}}(.*?){{end}}(?:\<\/p\>|\<br\s*?\/\s*>)?/is', $content, $tags, PREG_SET_ORDER );

		foreach ( $tags as $tag ) {
			$replace_content = ! empty( $query_params[ $tag[1] ] ) ? $tag[2]: '';
			$content = str_replace( $tag[0], $replace_content, $content );
		}

		return $content;
	}


	/**
	* Remove any template indicators in the content
	*
	* @param string $content The content from shortcode
	* @param boolean $debug If the debug flag is set, show an visible placeholder instead of removing
	*
	* @since 0.0.20
	*
	* @return string $content
	**/
	private function replace_nonmatched( $content, $debug ) {
		$content = preg_replace_callback(
			'/\{\{(.*?)\}\}/',
			function ( $matches ) use ( $debug ) {
				// If debug is set, display an red message, otherwise just blank it
				return ($debug ? '<b style="color:red;">[No value given for {{' . $matches[1] . '}}]</b>': '');
			},
			$content
		);

		return $content;
	}
}
