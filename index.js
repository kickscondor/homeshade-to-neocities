const NeoCities = require('neocities')
const counter = require('kicks-counter')
const netrc = require('netrc')
const path = require('path')
const url = require('url')
const walk = require('fswalk')

module.exports = function (src, opts, fn) {
  var H = this,
      creds = netrc()['neocities.org'],
      basepath = '/'

  if (opts.url) {
    basepath = url.parse(opts.url).pathname
  }
  if (!creds || !creds.login || !creds.password) {
    H.log.fail('No credentials in .netrc for neocities.org.')
    return callback()
  }

  var count = counter(300),
      api = new NeoCities(creds.login, creds.password),
      currentfile = 'Neocities'
  count.on('progress', () => {
    H.log.info(`To Neocities: ${currentfile} (${count.at} of ${count.total})`)
  })
  H.log.info('Connecting to Neocities.')
  walk(src, (filepath, stat) => {
    if (stat.isFile()) {
      count.todo()
      H.sha1file(filepath, sha1sum => {
        let filename = path.join(basepath, filepath.replace(src, ''))
        api.post('upload_hash', [{name: filename, value: sha1sum}], resp => {
          if (resp.files && resp.files[filename])
            return count.done()

          let obj = {path: filepath, name: filename}
          api.upload([obj], resp => {
            currentfile = obj.name 
            if (resp.result == 'error') {
              fn(new Error(resp.message), false)
            }
            count.done()
          })
        })
      })
    }
  }, err => {
    count.start(() => {
      fn(err, true)
    })
  })
}
