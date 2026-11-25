#!/usr/bin/env node
import('./src/index.mjs').catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
//提交测试