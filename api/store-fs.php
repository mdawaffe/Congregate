<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\API;

class Store_FS extends Store {
	public function __construct( public string $store_dir ) {
	}

	protected function file_from_id( string $table, string $id ): string {
		switch ( $table ) {
			case 'curated-lists' :
				$id = preg_replace( '/[^A-Za-z0-9]/', '_', $id );
				break;
		}

		return sprintf( '%s/%s/%s.json', $this->store_dir, $table, $id );
	}

	protected function long_prefix_from_id( string $table, string $id ): string {
		switch ( $table ) {
			case 'venues-visited' :
			case 'venues-liked' :
				$table = 'venues';
				break;
			case 'curated-lists' :
				$id = preg_replace( '/[^A-Za-z0-9]/', '_', $id );
				break;
		}

		return sprintf( '%s/full/%s/%s', $this->store_dir, $table, $id );
	}

	public function load( string $table, string $id ): ?array {
		$contents = file_get_contents( $this->file_from_id( $table, $id ) );
		if ( ! $contents ) {
			return null;
		}

		try {
			$json = json_decode( $contents, flags: \JSON_THROW_ON_ERROR | \JSON_OBJECT_AS_ARRAY );
			return $json;
		} catch ( \Exception $e ) {
			return null;
		}
	}

	public function store( string $table, string $id, array $item ): ?bool {
		try {
			$json = json_encode( $item, flags: \JSON_THROW_ON_ERROR );
		} catch ( \Exception $e ) {
			return false;
		}

		$file = $this->file_from_id( $table, $id );

		if ( file_exists( $file ) ) {
			$already = file_get_contents( $file );

			switch ( $table ) {
				case 'checkin' :
					$new = $item;
					unset( $new['venue'] );

					try {
						$old = json_decode( $already, flags: \JSON_THROW_ON_ERROR | \JSON_OBJECT_AS_ARRAY );
					} catch ( \Exception $e ) {
						return false;
					}
					unset( $old['venue'] );

					if ( $new == $old ) {
						return null;
					}
				case 'curated-lists' :
					$new = $item;
					unset( $new['placesSummary'], $new['photos'] );

					try {
						$old = json_decode( $already, flags: \JSON_THROW_ON_ERROR | \JSON_OBJECT_AS_ARRAY );
					} catch ( \Exception $e ) {
						return false;
					}
					unset( $old['placesSummary'], $old['photos'] );

					if ( $new == $old ) {
						return null;
					}
				default :
					if ( $json === $already ) {
						return null;
					}
					break;
			}
		}

		return strlen( $json ) === file_put_contents( $file, $json );
	}

	public function load_long( string $table, string $id ) {
		if ( 'photos' === $table ) {
			$files = glob( $this->long_prefix_from_id( $table, $id ) . '.*' );
			if ( ! $files ) {
				return null;
			}

			return file_get_contents( $files[0] );
		}

		$file = $this->long_prefix_from_id( $table, $id ) . '.json';

		$contents = file_get_contents( $file );
		if ( ! $contents ) {
			return null;
		}

		try {
			$json = json_decode( $contents, flags: \JSON_THROW_ON_ERROR | \JSON_OBJECT_AS_ARRAY );
			return $json;
		} catch ( \Exception $e ) {
			return null;
		}
	}

	public function store_long( string $table, string $id, array $short_item, $long_item ): bool {
		if ( 'photos' === $table ) {
			$extension = pathinfo( $short_item['suffix'], \PATHINFO_EXTENSION );
			$raw = is_string( $long_item ) ? $long_item : $long_item['raw'];
		} else {
			$extension = 'json';
			try {
				$raw = json_encode( $long_item, flags: \JSON_THROW_ON_ERROR );
			} catch ( \Exception $e ) {
				return false;
			}
		}

		return strlen( $raw ) === file_put_contents( $this->long_prefix_from_id( $table, $id ) . ".{$extension}", $raw );
	}

	public function last_from( string $table ): ?int {
		$paths = glob( sprintf( '%s/%s/%s.json', $this->store_dir, $table, '*' ) );
		if ( ! $paths ) {
			return null;
		}

		$paths = array_map( 'basename', $paths );
		$paths = array_map( 'intval', $paths );
		return max( $paths );
	}

	public function get_all_ids( string $table ): array {
		$paths = glob( $this->file_from_id( $table, '*' ) );
		return array_map( fn( $path ) => pathinfo( $path, \PATHINFO_FILENAME ), $paths );
	}

	public function get_all_long_ids( string $table ): array {
		$paths = glob( $this->long_prefix_from_id( $table, '*' ) );
		return array_map( fn( $path ) => pathinfo( $path, \PATHINFO_FILENAME ), $paths );
	}
}
