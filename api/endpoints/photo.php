<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item_List;

class Photo extends Item_List {
	public const TABLE = 'photos';
	// The long form is the image file.
	public const HAS_LONG_FORM = true;

	public const LIMIT = 200;

	const TRUNCATE_BY_TIME_KEY = 'createdAt';

	// The only extra data this contains (over the items returned in the list endpoint) is a user object.
	public function get( string $id ) {
		$path = sprintf( 'photos/%s', rawurlencode( $id ) );

		[ $response, $status, $headers ] = $this->api->get( $path, static::QUERY_PARAMS );

		return $response['response']['photo'];
	}

	public function list_short(
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
		?int $limit = null,
		?int $offset = null,
	) {
		$path = 'users/self/photos';

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

		return $response['response']['photos']['items'];
	}

	public function lengthen( array $photos ): iterable {
		// Probably faster to chunk these and use `curl_multi_init()`.
		foreach ( $photos as $i => $photo ) {
			if ( ! $photo || ! isset( $photo['id'] ) || ! isset( $photo['prefix'] ) || ! isset( $photo['suffix'] ) ) {
				echo "ERROR $i\n";
				var_dump( $photo );
				continue;
			}

			$url = sprintf( '%soriginal%s', $photo['prefix'], $photo['suffix'] );

			$context_options = [
				'http' => [
					'method' => 'GET',
					'timeout' => 3.0,
					'ignore_errors' => false,
					'user_agent' => sprintf( $this->api->user_agent, md5( $url ) ),
				],
				'ssl' => [
					'SNI_enabled' => true,
				],
			];

			$context = stream_context_create( $context_options );

			$response = file_get_contents(
				$url,
				context: $context,
			);

			yield $i => $response
				? [
					'id' => $photo['id'],
					'raw' => $response,
				]
				: [];
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
