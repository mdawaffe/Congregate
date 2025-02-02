<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item;

class User extends Item {
	public const TABLE = 'users';

	public function get( string $id ) {
		$path = sprintf( 'users/%s', rawurlencode( $id ) );

		[ $response, $status, $headers ] = $this->api->get( $path, static::QUERY_PARAMS );

		return $response['response']['user'];
	}
}
