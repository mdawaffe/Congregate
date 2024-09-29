<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item_List;

class Taste extends Item_List {
	public const TABLE = 'tastes';

	public function get( string $id ) {
		throw new \Exception( 'Not Implemented' );
	}

	public function list_short() {
		$path = 'users/self/tastes';

		$query_params = [
			...static::QUERY_PARAMS,
		];

		$query_params = array_filter( $query_params, fn( $value ) => null !== $value );

		[ $response, $status, $headers ] = $this->api->get( $path, $query_params );

		return $response['response']['tastes']['items'];
	}

	public function normalize_params(): array {
		return [];
	}

	public function increment(): ?array {
		return null;
	}
}
