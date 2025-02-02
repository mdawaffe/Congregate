<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item_List;

class Activity extends Item_List {
	public const TABLE = 'activities';

	public const LIMIT = 200;

	protected $leading_marker;
	protected $trailing_marker;
	protected $more_data;

	public function get( string $id ) {
		throw new \Exception( 'Not Implemented' );
	}

	public function list_short(
		?int $limit = null,
		?string $after_marker = null,
		?string $before_marker = null,
	) {
		$path = 'users/self/activities';

		$query_params = [
			...static::QUERY_PARAMS,
			'limit' => $limit,
			'afterMarker' => $after_marker,
			'beforeMarker' => $before_marker,
		];

		$query_params = array_filter( $query_params, fn( $value ) => null !== $value );

		[ $response, $status, $headers ] = $this->api->get( $path, $query_params );
		$this->leading_marker = $response['response']['activities']['leadingMarker'];
		$this->trailing_marker = $response['response']['activities']['trailingMarker'];
		$this->more_data = $response['response']['activities']['moreData'];

		return $response['response']['activities']['items'];
	}

	public function normalize_params(
		?int $limit = null,
		?string $after_marker = null,
		?string $before_marker = null,
	): array {
		if ( null === $limit || static::LIMIT < $limit ) {
			$limit = static::LIMIT;
		}

		return compact(
			'limit',
			'after_marker',
			'before_marker',
		);
	}

	public function increment(
		?int $limit = null,
		?string $after_marker = null,
		?string $before_marker = null,
	): ?array {
		if ( ! $this->more_data ) {
			return null;
		}
		
		return [
			$limit,
			$after_marker,
			$this->trailing_marker, // Set before_marker to previous request's trailing_marker.
		];
	}
}
