<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

class Venue_Liked extends Venue {
	public const TABLE = 'venues-liked';

	const TRUNCATE_BY_TIME_KEY = 'ratedAt';

	public function list_short(
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
		?int $limit = null,
		?int $offset = null,
	) {
		$path = 'users/self/venuelikes';

		$query_params = [
			...static::QUERY_PARAMS,
			'sort' => $sort, // Doesn't actually do anything
			'beforeTimestamp' => $before, // Doesn't actually do anything
			'afterTimestamp' => $after, // Dosen't actually do anything
			'limit' => $limit,
			'offset' => $offset,
		];

		$query_params = array_filter( $query_params, fn( $value ) => null !== $value );

		[ $response, $status, $headers ] = $this->api->get( $path, $query_params );

		return $response['response']['venues']['items'];
	}
}
