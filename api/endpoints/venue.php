<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item_List;

abstract class Venue extends Item_List {
	public const HAS_LONG_FORM = true;

	public const QUERY_PARAMS = [
		'followTombstones' => 'false',
	];

	public function get( string $id ) {
		$path = sprintf( 'venues/%s', rawurlencode( $id ) );

		[ $response, $status, $headers ] = $this->api->get( $path, static::QUERY_PARAMS );

		return $response['response']['venue'];
	}

	public function lengthen( array $items ): iterable {
		foreach ( array_chunk( $items, 5, true ) as $chunk ) {
			$venue_ids = array_combine( array_keys( $chunk ), array_column( $chunk, 'id' ) );
			$path = 'multi';
			$requests = array_map(
				fn( $venue_id ) => [ 'path' => sprintf( 'venues/%s', $venue_id ), 'query_string' => static::QUERY_PARAMS ],
				$venue_ids,
			);

			[ $responses, $status, $headers, $r ] = $this->api->batch_get( $requests );
			try {
				$long_venues = array_combine( array_keys( $responses ), array_column( $responses, 'venue' ) );
			} catch ( \ValueError $e ) {
				var_dump( $r );
				exit( 1 );
			}

			// Note: Return long. Don't merge short with long unless the --lengthen code is refactored to treat
			// venues-visited and venues-liked differently.
			yield from $long_venues;
		}
	}

	public function normalize_params(
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
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
			'limit',
			'offset',
		);
	}

	public function increment(
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
		?int $limit = null,
		?int $offset = null,
	): array {
		return [
			$sort,
			$before,
			$after,
			$limit,
			( $offset ?? 0 ) + $limit,
		];
	}
}
