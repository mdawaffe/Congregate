<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm;

use MDAWaffe\Swarm\API\Exception\Rate_Limit;

class API {
	public const API_URL = 'https://api.foursquare.com/v2';
	public const VERSION = '20240716';

	public function __construct(
		private ?string $access_token = null,
		public ?string $user_agent = null,
	) {
		if ( null === $user_agent ) {
			$this->user_agent = 'mdawaffe-4sq-pull/%s';
		}
	}

	function request( string $method, string $path, array $query_string = [], ?array $body = null ) {
		$query_string['v'] = self::VERSION;
		if ( $this->access_token ) {
			$query_string['oauth_token'] = $this->access_token;
		}

		$context_options = [
			'http' => [
				'method' => strtoupper( $method ),
				'timeout' => 3.0,
				'ignore_errors' => true,
				'user_agent' => sprintf( $this->user_agent, md5( $path ) ),
				'header' => [
					'Accept-Language: en',
				],
			],
			'ssl' => [
				'SNI_enabled' => true,
			],
		];

		if ( 'POST' === $method ) {
			$context_options['http']['header'][] = 'Content-Type: application/x-www-form-urlencoded';
			$context_options['http']['content'] = http_build_query( $body, encoding_type: PHP_QUERY_RFC1738 );
		}

		$context = stream_context_create( $context_options );

		$url = sprintf( '%s/%s?', self::API_URL, ltrim( $path, '/' ) )
			. http_build_query( $query_string, encoding_type: PHP_QUERY_RFC3986 );

		$response = file_get_contents(
			$url,
			context: $context,
		);

		$status = 0;
		$headers = [];
		foreach ( $http_response_header as $header ) {
			if ( 0 === strpos( $header, 'HTTP/' ) ) {
				$status = (int) explode( ' ', $header )[1];
			} else {
				[ $name, $value ] = explode( ':', $header, 2 );
				$name = strtolower( trim( $name ) );
				$value = trim( $value );
				if ( isset( $headers[ $name ] ) ) {
					$headers[ $name ][] = $value;
				} else {
					$headers[ $name ] = [ $value ];
				}
			}
		}

		$json_response = json_decode( $response, true );

		if ( 403 === $status && 'rate_limit_exceeded' === $json_response['meta']['errorType'] ?? '' ) {
			throw new Rate_Limit( isset( $headers['x-ratelimit-reset'] ) ? (int) $headers['x-ratelimit-reset'][0] : time() + 60 * 60, $headers );
		}

		if ( 200 !== $status ) {
			throw new \Exception( join( "\n", $http_response_header ) . "\n\n" . $response );
		}

		return [
			$json_response,
			$status,
			$headers
		];
	}

	function get( string $path, array $query_string = [] ) {
		return $this->request( 'GET', $path, $query_string );
	}

	/**
	 * Does not get around any rate limits. Just fewer HTTP requests.
	 */
	function batch_get( array $requests ) {
		$paths = [];
		foreach ( $requests as $request ) {
			$paths[] = sprintf( '/%s?%s', ltrim( $request['path'], '/' ), http_build_query( $request['query_string'], encoding_type: PHP_QUERY_RFC3986 ) );
		}

		[ $response, $status, $headers ] = $this->get( 'multi', [ 'requests' => join( ',', $paths ) ] );
		$responses = array_column( $response['response']['responses'], 'response' );
		return [ array_combine( array_keys( $requests ), $responses ), $status, $headers, $response ];
	}

	function post( string $path, array $query_string = [], ?array $body = null ) {
		return $this->request( 'POST', $path, $query_string, $body );
	}
}
