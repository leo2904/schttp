Vue.component('file-component', { 
    props: [
        "file" // Our definition of a file
    ],
    computed: {
        humanSize() {
            return humanFileSize(this.file.raw.size, true)
        },
        // Use the full path or just the name if its empty
        name() {
            if (this.file.raw.webkitRelativePath) {
                return this.file.raw.webkitRelativePath
            }
            return this.file.raw.name
        },
        progressStyle() {
            return "width: " + this.file.progress + "%;"
        },
        progressState() {
            if (this.file.state == "transfered") {
                return {
                    "bg-success": true
                }
            }
            return {}
        },
        humanLoadedSize() {
            return humanFileSize(this.file.loaded, true)
        }
    },
    template: `<span href="#" class="list-group-item list-group-item-action flex-column align-items-start">
    <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1">{{ name }}</h5>
        <small> {{ humanLoadedSize }} / {{ humanSize }}</small>
    </div>
    <div class="progress">
        <div class="progress-bar" :class="progressState" :style="progressStyle" role="progressbar"></div>
    </div>
    <small>{{ file.state }}</small>
    </span>`
})


var app = new Vue({
    el: '#app',
    data: {
        scpCommand: 'scp -r scp.click:HvL5Q8qmg .',
        files: [],
        nextId: 1,
        transferReady: true,
    },
    methods: {
        appendFiles(refName) {
            // it seems what we are dealing with here is not really "arrays"
            // so we must loop them to add them into this.files
            var len = this.$refs[refName].files.length
            var i = 0
            
            while ( i < len ) {
                // localize file var in the loop

                var file = NewFile(this.nextId, this.$refs[refName].files[i])
                this.nextId++
                
                this.files.unshift(file)
                i++
            }

            if (this.transferReady) {
                this.transmitNextFile()
            }    
        },
        // transmitNextFile reads files from the top of this.files
        // and transmit's it - then i calls it self again
        transmitNextFile() {
            var file = this.files[0];
            if (file.state != "queued") {
                return
            }
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/source/', true);

            xhr.onload = function() {                
                console.log("the File has been transferred.")

                file.state = "transfered"
                
                // put this top file at the bottom of the array
                this.files.push(this.files.shift())
                
                this.transmitNextFile()
            }.bind(this)

          
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    file.progress = (e.loaded / e.total) * 100
                    file.loaded = e.loaded
                    console.log("progress", file.progress, e)

                }
            };

            // this modern xhr should understand the native File type
            file.state = "transfering"
            xhr.send(file.raw);

        }
    }
})

function NewFile(id, file) {
    return {
        id: id,
        raw: file,
        state: "queued",
        progress: 0,
        loaded: 0
    }
}

// special thanks to `mpen` from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
}