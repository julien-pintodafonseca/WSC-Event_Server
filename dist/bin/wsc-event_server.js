#! /usr/bin/env node
'use strict';

const {
  port,
  host
} = require('../config'); // Pass configuration to application


require('..')({
  port,
  host
});