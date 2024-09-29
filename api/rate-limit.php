<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm\API\Exception;

class Rate_Limit extends \Exception {
	public function __construct( public ?int $retry_at, public array $headers ) {
		parent::__construct( 'Rate Limit Reached' );
	}
}
