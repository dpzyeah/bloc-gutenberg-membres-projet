import { registerBlockType } from '@wordpress/blocks';
import './style.scss';

import Edit from './edit';
import Icons from '../../common/icons';
import metadata from './block.json';

/**
 * Every block starts by registering a new block type definition.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */
registerBlockType( metadata.name, {
	/**
	 * @see ./edit.js
	 */
	icon: Icons.playmobile,
	edit: Edit,

	/**
	 * @see ./render.php
	 */
	save: () => null,
} );
