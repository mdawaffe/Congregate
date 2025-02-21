<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\Endpoint;

use MDAWaffe\Swarm\API\Item_List;

class Checkin extends Item_List {
	public const TABLE = 'checkins';
	public const HAS_LONG_FORM = true;

	public const QUERY_PARAMS = [
		'includeOverlapPhotos' => 1,
	];

	public function get( string $id ) {
		$path = sprintf( 'checkins/%s', rawurlencode( $id ) );

		[ $response, $status, $headers ] = $this->api->get( $path, static::QUERY_PARAMS );

		return $response['response']['checkin'];
	}

	public function add(
		string $venue_id,
		?string $message = null,
		?string $event_id = null,
		?int $datetime = null,
		?float $latitude = null,
		?float $longitude = null,
		?float $altitude = null,
		?float $ll_accuracy = 5.215912,
		?float $altitude_accuracy = 12.868117,
	) {
		$path = 'checkins/add';

		if ( null === $latitude || null === $longitude ) {
			$latitude = null;
			$longitude = null;
			$altitude = null;
			$ll_accuracy = null;
		}

		if ( null === $altitude ) {
			$altitude_accuracy = null;
		}

		if ( null !== $latitude && null !== $longitude ) {
			$ll = sprintf( '%f,%f', $latitude, $longitude );
		} else {
			$ll = null;
		}

		$body = [
			'venueId' => $venue_id,
			'shout' => $message,
			'eventId' => $event_id,
			'datetime' => $datetime,
			'll' => $ll,
			'alt' => $altitude,
			'llAcc' => $ll_accuracy,
			'altAcc' => $altitude_accuracy,
			'broadcast' => 'public', // CSV: private, public, facebook, twitter, followers (celebrity mode users only)
			// 'stickerId' => '', // Sticker ID
			// 'hasPhoto' => null, // null or 1. Tells Swarm to prepare for incoming photos? Not sure what it's useful for.
			// 'totalPhotoCount' => null // ?int. ^^^^?
			// 'broadcastLater' => null // null or 1. Tells Swarm not to submit to socials (or friends' swarm feeds?) until photos are submitted. I think.
			// 'mentions' => '',
			/*
			 * Mentions in your check-in. This parameter is a semicolon-delimited list of mentions. A single mention is
			 * of the form start,end,userid, where start is the index of the first character in the shout representing
			 * the mention, end is the index of the first character in the shout after the mention, and userid is the
			 * userid of the user being mentioned. If userid is prefixed with fbu-, this indicates a Facebook userid
			 * that is being mentioned. Character indices in shouts are 0-based.
			 */
		];

		$body = array_filter( $body, fn( $value ) => null !== $value );

		[ $response, $status, $headers ] = $this->api->post( $path, static::QUERY_PARAMS, $body );

		return $response['response']['checkin'];
	}

	public function list_short(
		string $sort = 'newestfirst',
		?int $before = null,
		?int $after = null,
		?int $limit = null,
		?int $offset = null,
	) {
		$path = 'users/self/checkins';

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

		return $response['response']['checkins']['items'];
	}

	public function lengthen( array $short_checkins ): iterable {
		foreach ( array_chunk( $short_checkins, 5, true ) as $chunk ) {
			$checkin_ids = array_combine( array_keys( $chunk ), array_column( $chunk, 'id' ) );
			$path = 'multi';
			$requests = array_map(
				fn( $checkin_id ) => [ 'path' => sprintf( 'checkins/%s', $checkin_id ), 'query_string' => static::QUERY_PARAMS ],
				$checkin_ids,
			);

			[ $responses, $status, $headers ] = $this->api->batch_get( $requests );
			$long_checkins = array_combine( array_keys( $responses ), array_column( $responses, 'checkin' ) );

			yield from $long_checkins;
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
