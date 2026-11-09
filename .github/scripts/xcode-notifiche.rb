# Aggiunge GoogleService-Info.plist e App.entitlements (aps-environment) al target App del progetto Xcode.
# Si lancia da app/ios/App, solo quando le notifiche sono attive.
require "xcodeproj"
p = Xcodeproj::Project.open("App.xcodeproj")
t = p.targets.find { |x| x.name == "App" } or abort("Target App non trovato")
g = p.main_group["App"] or abort("Gruppo App non trovato")
f = g.files.find { |x| x.path == "GoogleService-Info.plist" } || g.new_reference("GoogleService-Info.plist")
t.add_resources([f]) unless t.resources_build_phase.files_references.include?(f)
t.build_configurations.each { |c| c.build_settings["CODE_SIGN_ENTITLEMENTS"] = "App/App.entitlements" }
p.save
abort("GoogleService-Info.plist mancante") unless File.exist?("App/GoogleService-Info.plist")
puts "GoogleService-Info.plist ed entitlements aggiunti"
