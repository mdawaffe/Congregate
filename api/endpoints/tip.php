<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item_List;

class Tip extends Item_List {
	public const TABLE = 'tips';
	public const HAS_LONG_FORM = true;

	const TRUNCATE_BY_TIME_KEY = 'createdAt';

	public function get( string $id ) {
		$path = sprintf( 'tips/%s', rawurlencode( $id ) );

		[ $response, $status, $headers ] = $this->api->get( $path, static::QUERY_PARAMS );

		return $response['response']['tip'];
	}

	public function list_short(
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
		?string $category_id = null,
		?string $venue_id = null,
		?int $limit = null,
		?int $offset = null,
	) {
		$path = 'users/self/tips';

		$query_params = [
			...static::QUERY_PARAMS,
			'sort' => $sort,
			'beforeTimestamp' => $before,
			'afterTimestamp' => $after,
			'categoryId' => $category_id,
			'venueId' => $venue_id,
			'limit' => $limit,
			'offset' => $offset,
		];

		$query_params = array_filter( $query_params, fn( $value ) => null !== $value );

		[ $response, $status, $headers ] = $this->api->get( $path, $query_params );

		return $response['response']['tips']['items'];
	}

	public function lengthen( array $short_tips ): iterable {
		foreach ( array_chunk( $short_tips, 5, true ) as $chunk ) {
			$tip_ids = array_combine( array_keys( $chunk ), array_column( $chunk, 'id' ) );
			$path = 'multi';
			$requests = array_map(
				fn( $tip_id ) => [ 'path' => sprintf( 'tips/%s', $tip_id ), 'query_string' => static::QUERY_PARAMS ],
				$tip_ids,
			);

			[ $responses, $status, $headers ] = $this->api->batch_get( $requests );
			$long_tips = array_combine( array_keys( $responses ), array_column( $responses, 'tip' ) );

			// /v2/tips/:id is not a superset of /v2/users/self/tips[i] :(
			// We need to merge them to get everything.
			foreach ( $long_tips as $i => $long_tip ) {
				if ( ! isset( $long_tip['id'] ) ) {
					continue;
				}

				yield $i => array_merge( $long_tip, $chunk[ $i ] );
			}
		}
	}

	public function normalize_params(
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
		?string $category_id = null,
		?string $venue_id = null,
		?int $limit = null,
		?int $offset = null,
	): array {
		if ( null === $limit || static::LIMIT < $limit ) {
			$limit = static::LIMIT;
		}

		return compact(
			'sort',
			'before',
			'after',
			'category_id',
			'venue_id',
			'limit',
			'offset',
		);
	}

	public function increment( 
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
		?string $category_id = null,
		?string $venue_id = null,
		?int $limit = null,
		?int $offset = null,
	): array {
		return [
			$sort,
			$before,
			$after,
			$category_id,
			$venue_id,
			$limit,
			( $offset ?? 0 ) + $limit,
		];
	}
}
