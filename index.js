const kicktock = require('kicktock')
const path = require('path')
const queue = require('queue')
const request = require('superagent')
const url = require('url')

module.exports = function (src, opts, fn) {
  var H = this,
      creds = H.storage.netrc('neocities.org'),
      basepath = '/'

  console.log([src, opts])
  if (opts.url) {
    basepath = url.parse(opts.url).pathname
  }
  if (!creds || !creds.login || !creds.password) {
    return fn(new Error('No credentials in .netrc for neocities.org.'), true)
  }

  //
  // Compute all file hashes
  //
  var K = kicktock(300),
      hashes = {}
  K.on('progress', () => {
    H.log.info(`Hashing files (${K.at} of ${K.total})`)
  })
  H.storage.walk(src, K.errorFirst((filepath, stat) => {
    if (stat.isFile()) {
      H.sha1file(path.join(src, filepath), K(sha1sum => {
        let filename = path.join(basepath, filepath)
        hashes[filename] = sha1sum
      }))
    }
  }), _ => {
    K.go(_ => {
      var agent = request.agent().auth(creds.login, creds.password)
      H.log.info('Connecting to Neocities.')
      //
      // Send all file hashes to be checked
      //
      agent.post('https://neocities.org/api/upload_hash')
        .type('form')
        .send(hashes)
        .end((err, res) => {
          if (err) {
            fn(err, false)
            return
          }

          //
          // Upload the files that have changed.
          //
          let q = queue({concurrency: 1})
          let total = Object.keys(hashes).length
          for (let filename in hashes) {
            if (res.body.files[filename])
              continue

            let filepath = path.join(src, filename.replace(basepath, ''))
            q.push(function (cb) {
              agent.post('https://neocities.org/api/upload')
                .attach(filename, H.storage.createReadStream(filepath))
              .end((err, res) => {
                H.log.note(`Uploading files (${q.length} left of ${total})`)
                if (err)
                  fn(err, false)
                cb()
              })
            })
          }
          q.start(() => {
            fn(null, true)
          })
        })
    })
  })
}
