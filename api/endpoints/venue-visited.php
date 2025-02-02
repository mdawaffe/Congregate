<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

class Venue_Visited extends Venue {
	public const TABLE = 'venues-visited';

	public const LIMIT = 500;

	public function list_short(
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
		?int $limit = null,
		?int $offset = null,
	) {
		$path = 'users/self/venuehistory';

		$query_params = [
			...static::QUERY_PARAMS,
			'sort' => $sort,
			'beforeTimestamp' => $before,
			'afterTimestamp' => $after,
			'limit' => $limit,
			'offset' => $offset,
		];

		$query_params = array_filter( $query_params, fn( $value ) => null !== $value );

		[ $response, $status, $headers ] = $this->api->get( $path, $query_params );

		$venues = array_column( $response['response']['venues']['items'], 'venue' );
		$been_heres = array_column( $response['response']['venues']['items'], 'beenHere' );
		foreach ( $venues as $i => &$venue ) {
			$venue['beenHere']['count'] = $been_heres[ $i ];
		}
		return $venues;
	}
}
