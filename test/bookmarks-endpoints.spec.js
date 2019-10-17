const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { fixtures } = require('./bookmarks.fixtures')

describe('Bookmarks Endpoints', function() {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  describe(`GET /bookmarks`, () => {
    context(`Given no bookmarks`, () => {
     it(`responds with 200 and an empty list`, () => {
       return supertest(app)
         .get('/bookmarks')
         .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
         .expect(200, [])
     })
   })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  })

  describe(`GET /bookmarks/:id`, () => {
    context(`Given no bookmarks`, () => {
     it(`responds with 404`, () => {
       const bookmark_id = 123456
       return supertest(app)
         .get(`/bookmarks/${bookmark_id}`)
         .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
         .expect(404, { error: { message: `Bookmark Not Found` } })
     })
   })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmark_id = 2
        const expectedBookmark = testBookmarks[bookmark_id - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmark_id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })

    context(`Given an XSS attack bookmark`, () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: 'www.xss.com',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 3
      }

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert([ maliciousBookmark ])
        })

        it('removes XSS attack content', () => {
          return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
        })
      })
  })

  describe(`POST /bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
       const newBookmark = {
         title: 'Test bookmark',
         url: 'www.testing.com',
         description: 'This page is all about tests...',
         rating: 4
       }
       return supertest(app)
         .post('/bookmarks')
         .send(newBookmark)
         .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
         .expect(201)
         .expect(res => {
           expect(res.body.title).to.eql(newBookmark.title)
           expect(res.body.url).to.eql(newBookmark.url)
           expect(res.body.description).to.eql(newBookmark.description)
           expect(res.body.rating).to.eql(newBookmark.rating)
           expect(res.body).to.have.property('id')
           expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
         })
         .then(postRes =>
          supertest(app)
            .get(`/bookmarks/${postRes.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(postRes.body)
         )
     })

    const requiredFields = ['title', 'url', 'rating']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test bookmark',
        url: 'wwww.mytesturl.com',
        rating: 3
      }

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newBookmark[field]

        return supertest(app)
        .post('/bookmarks')
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `Missing '${field}' in request body` }
        })
      })
    })

    it('removes XSS attack content from response', () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: 'www.xss.com',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 3
      }

      return supertest(app)
       .post(`/bookmarks`)
       .send(maliciousBookmark)
       .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
       .expect(201)
       .expect(res => {
         expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
         expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
       })
     })

  })

  describe(`DELETE /bookmarks/:bookmark_id`, () => {
    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 204 and removes the bookmark', () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
        return supertest(app)
          .delete(`/bookmarks/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
           supertest(app)
              .get(`/bookmarks`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          )
      })
    })

    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456
        return supertest(app)
          .delete(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark Not Found` } })
      })
    })
  })
})
